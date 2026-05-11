import type { Database } from "better-sqlite3";
import type { MessageDTO } from "../entities";
import { toMessageDTO } from "../mappers";

const messageSelect = `
  SELECT
    id,
    session_id AS sessionId,
    workspace_id AS workspaceId,
    role,
    text,
    audio_url AS audioUrl,
    created_at AS createdAt
  FROM messages
`;

export class MessagesRepo {
  constructor(private readonly db: Database) {}

  async put(m: Readonly<Omit<MessageDTO, "createdAt">> & { createdAtMs: number }): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO messages (id, session_id, workspace_id, role, text, audio_url, created_at)
      VALUES (@id, @sessionId, @workspaceId, @role, @text, @audioUrl, @createdAt)
    `,
      )
      .run({
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
    const rows = this.db
      .prepare(`${messageSelect} WHERE session_id = ? ORDER BY created_at ASC, id ASC`)
      .all(sessionId) as Record<string, unknown>[];
    return rows.map((it) => toMessageDTO(it));
  }

  async recentForWorkspace(workspaceId: string, limit: number): Promise<MessageDTO[]> {
    const lim = Math.min(limit, 500);
    const rows = this.db
      .prepare(
        `${messageSelect} WHERE workspace_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .all(workspaceId, lim) as Record<string, unknown>[];
    return rows.map((it) => toMessageDTO(it));
  }
}
