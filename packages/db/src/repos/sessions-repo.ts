import type { Database } from "better-sqlite3";
import type { SessionDTO } from "../entities";
import { toSessionDTO } from "../mappers";

/** Pagination token for `/workspace/sessions` (newest first). */
export type SessionCursor = Readonly<{
  startedAt: number;
  id: string;
}>;

const sessionRowSelect = `
  SELECT
    id,
    workspace_id AS workspaceId,
    started_at AS startedAt,
    ended_at AS endedAt,
    duration_sec AS durationSec,
    resolved,
    message_count AS messageCount
  FROM sessions
`;

export class SessionsRepo {
  constructor(private readonly db: Database) {}

  async findByIdAndWorkspace(
    sessionId: string,
    workspaceId: string,
  ): Promise<SessionDTO | null> {
    const row = this.db
      .prepare(`${sessionRowSelect} WHERE id = ? AND workspace_id = ?`)
      .get(sessionId, workspaceId) as Record<string, unknown> | undefined;
    return row ? toSessionDTO(row) : null;
  }

  async createForWorkspace(workspaceId: string, sessionId: string): Promise<SessionDTO> {
    const startedAt = Date.now();
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `
        INSERT INTO sessions (id, workspace_id, started_at, ended_at, duration_sec, resolved, message_count)
        VALUES (?, ?, ?, NULL, 0, 0, 0)
      `,
        )
        .run(sessionId, workspaceId, startedAt);
      const w = this.db
        .prepare(`UPDATE workspaces SET session_count = session_count + 1 WHERE id = ?`)
        .run(workspaceId);
      if (w.changes === 0) {
        throw new Error("Workspace missing for session create");
      }
    });
    tx();

    const row = await this.findByIdAndWorkspace(sessionId, workspaceId);
    if (!row) throw new Error("Session create failed unexpectedly");
    return row;
  }

  async patch(
    sessionId: string,
    patch: Partial<Pick<SessionDTO, "endedAt" | "durationSec" | "resolved">>,
  ): Promise<void> {
    const parts: string[] = [];
    const vals: unknown[] = [];
    if (patch.endedAt !== undefined) {
      parts.push("ended_at = ?");
      vals.push(patch.endedAt);
    }
    if (patch.durationSec !== undefined) {
      parts.push("duration_sec = ?");
      vals.push(patch.durationSec);
    }
    if (patch.resolved !== undefined) {
      parts.push("resolved = ?");
      vals.push(patch.resolved ? 1 : 0);
    }
    if (parts.length === 0) return;
    vals.push(sessionId);
    this.db
      .prepare(`UPDATE sessions SET ${parts.join(", ")} WHERE id = ?`)
      .run(...vals);
  }

  async markEndedIfOpen(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE sessions SET ended_at = ? WHERE id = ? AND ended_at IS NULL`,
      )
      .run(now, sessionId);
  }

  async addMessageCount(sessionId: string, delta: number): Promise<void> {
    if (delta === 0) return;
    this.db
      .prepare(`UPDATE sessions SET message_count = message_count + ? WHERE id = ?`)
      .run(delta, sessionId);
  }

  async listByWorkspacePage(
    workspaceId: string,
    limit: number,
    exclusiveStartKey?: SessionCursor | undefined,
  ): Promise<{ items: SessionDTO[]; nextKey?: SessionCursor }> {
    const lim = Math.min(Math.max(limit, 1), 100);
    let rows: Record<string, unknown>[];
    if (exclusiveStartKey) {
      rows = this.db
        .prepare(
          `
        ${sessionRowSelect}
        WHERE workspace_id = ?
          AND (started_at < ? OR (started_at = ? AND id < ?))
        ORDER BY started_at DESC, id DESC
        LIMIT ?
      `,
        )
        .all(
          workspaceId,
          exclusiveStartKey.startedAt,
          exclusiveStartKey.startedAt,
          exclusiveStartKey.id,
          lim,
        ) as Record<string, unknown>[];
    } else {
      rows = this.db
        .prepare(
          `
        ${sessionRowSelect}
        WHERE workspace_id = ?
        ORDER BY started_at DESC, id DESC
        LIMIT ?
      `,
        )
        .all(workspaceId, lim) as Record<string, unknown>[];
    }

    const items = rows.map((it) => toSessionDTO(it));
    const rawLast = rows[rows.length - 1];
    const startedMs =
      rawLast && typeof rawLast.startedAt === "number"
        ? rawLast.startedAt
        : rawLast
          ? Number(rawLast.startedAt)
          : NaN;
    const nextKey =
      rows.length === lim && rawLast && Number.isFinite(startedMs)
        ? ({ startedAt: startedMs, id: String(rawLast.id) } as const)
        : undefined;
    return { items, ...(nextKey ? { nextKey } : {}) };
  }

  async listAllByWorkspace(workspaceId: string): Promise<SessionDTO[]> {
    const rows = this.db
      .prepare(
        `${sessionRowSelect} WHERE workspace_id = ? ORDER BY started_at DESC, id DESC`,
      )
      .all(workspaceId) as Record<string, unknown>[];
    return rows.map((it) => toSessionDTO(it));
  }
}
