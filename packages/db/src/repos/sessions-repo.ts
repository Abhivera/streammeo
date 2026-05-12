import type { Collection, Db } from "mongodb";
import type { SessionDTO } from "../entities";
import { toSessionDTO } from "../mappers";

/** Pagination token for `/workspace/sessions` (newest first). */
export type SessionCursor = Readonly<{
  startedAt: number;
  id: string;
}>;

type SessionDoc = Readonly<{
  _id: string;
  workspaceId: string;
  startedAt: number;
  endedAt: string | null;
  durationSec: number;
  resolved: boolean;
  messageCount: number;
}>;

function docToRow(doc: SessionDoc): Record<string, unknown> {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt,
    durationSec: doc.durationSec,
    resolved: doc.resolved,
    messageCount: doc.messageCount,
  };
}

export class SessionsRepo {
  private readonly coll: Collection<SessionDoc>;
  private readonly workspaces: Collection<{ _id: string }>;

  constructor(db: Db) {
    this.coll = db.collection<SessionDoc>("sessions");
    this.workspaces = db.collection("workspaces");
  }

  async findByIdAndWorkspace(
    sessionId: string,
    workspaceId: string,
  ): Promise<SessionDTO | null> {
    const doc = await this.coll.findOne({ _id: sessionId, workspaceId });
    return doc ? toSessionDTO(docToRow(doc)) : null;
  }

  async createForWorkspace(workspaceId: string, sessionId: string): Promise<SessionDTO> {
    const startedAt = Date.now();
    const w = await this.workspaces.updateOne(
      { _id: workspaceId },
      { $inc: { sessionCount: 1 } },
    );
    if (w.matchedCount === 0) {
      throw new Error("Workspace missing for session create");
    }
    try {
      await this.coll.insertOne({
        _id: sessionId,
        workspaceId,
        startedAt,
        endedAt: null,
        durationSec: 0,
        resolved: false,
        messageCount: 0,
      });
    } catch (e) {
      await this.workspaces.updateOne({ _id: workspaceId }, { $inc: { sessionCount: -1 } });
      throw e;
    }

    const row = await this.findByIdAndWorkspace(sessionId, workspaceId);
    if (!row) throw new Error("Session create failed unexpectedly");
    return row;
  }

  async patch(
    sessionId: string,
    patch: Partial<Pick<SessionDTO, "endedAt" | "durationSec" | "resolved">>,
  ): Promise<void> {
    const $set: Record<string, unknown> = {};
    if (patch.endedAt !== undefined) $set.endedAt = patch.endedAt;
    if (patch.durationSec !== undefined) $set.durationSec = patch.durationSec;
    if (patch.resolved !== undefined) $set.resolved = patch.resolved;
    if (Object.keys($set).length === 0) return;
    await this.coll.updateOne({ _id: sessionId }, { $set });
  }

  async markEndedIfOpen(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.coll.updateOne(
      { _id: sessionId, endedAt: null },
      { $set: { endedAt: now } },
    );
  }

  async addMessageCount(sessionId: string, delta: number): Promise<void> {
    if (delta === 0) return;
    await this.coll.updateOne({ _id: sessionId }, { $inc: { messageCount: delta } });
  }

  async listByWorkspacePage(
    workspaceId: string,
    limit: number,
    exclusiveStartKey?: SessionCursor | undefined,
  ): Promise<{ items: SessionDTO[]; nextKey?: SessionCursor }> {
    const lim = Math.min(Math.max(limit, 1), 100);
    const filter: Record<string, unknown> = exclusiveStartKey
      ? {
          workspaceId,
          $or: [
            { startedAt: { $lt: exclusiveStartKey.startedAt } },
            {
              startedAt: exclusiveStartKey.startedAt,
              _id: { $lt: exclusiveStartKey.id },
            },
          ],
        }
      : { workspaceId };

    const docs = await this.coll
      .find(filter)
      .sort({ startedAt: -1, _id: -1 })
      .limit(lim)
      .toArray();

    const items = docs.map((d) => toSessionDTO(docToRow(d)));
    const rawLast = docs[docs.length - 1];
    const nextKey =
      docs.length === lim && rawLast
        ? ({ startedAt: rawLast.startedAt, id: rawLast._id } as const)
        : undefined;
    return { items, ...(nextKey ? { nextKey } : {}) };
  }

  async listAllByWorkspace(workspaceId: string): Promise<SessionDTO[]> {
    const docs = await this.coll
      .find({ workspaceId })
      .sort({ startedAt: -1, _id: -1 })
      .toArray();
    return docs.map((d) => toSessionDTO(docToRow(d)));
  }
}
