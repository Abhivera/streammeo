import type { Collection, Db } from "mongodb";
import type { MessageDTO } from "../entities";
import { toMessageDTO } from "../mappers";

type MessageDoc = Readonly<{
  _id: string;
  id: string;
  sessionId: string;
  workspaceId: string;
  role: string;
  text: string;
  audioUrl: string | null;
  createdAt: number;
}>;

function docToRow(doc: MessageDoc): Record<string, unknown> {
  return {
    id: doc.id,
    sessionId: doc.sessionId,
    workspaceId: doc.workspaceId,
    role: doc.role,
    text: doc.text,
    audioUrl: doc.audioUrl,
    createdAt: doc.createdAt,
  };
}

export class MessagesRepo {
  private readonly coll: Collection<MessageDoc>;

  constructor(db: Db) {
    this.coll = db.collection<MessageDoc>("messages");
  }

  async put(m: Readonly<Omit<MessageDTO, "createdAt">> & { createdAtMs: number }): Promise<void> {
    const _id = `${m.sessionId}::${m.id}`;
    await this.coll.insertOne({
      _id,
      id: m.id,
      sessionId: m.sessionId,
      workspaceId: m.workspaceId,
      role: m.role,
      text: m.text,
      audioUrl: m.audioUrl,
      createdAt: m.createdAtMs,
    });
  }

  async listForSessionAscending(sessionId: string): Promise<MessageDTO[]> {
    const docs = await this.coll
      .find({ sessionId })
      .sort({ createdAt: 1, id: 1 })
      .toArray();
    return docs.map((d) => toMessageDTO(docToRow(d)));
  }

  async recentForWorkspace(workspaceId: string, limit: number): Promise<MessageDTO[]> {
    const lim = Math.min(limit, 500);
    const docs = await this.coll
      .find({ workspaceId })
      .sort({ createdAt: -1, id: -1 })
      .limit(lim)
      .toArray();
    return docs.map((d) => toMessageDTO(docToRow(d)));
  }
}
