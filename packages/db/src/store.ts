import type { Database } from "better-sqlite3";
import type { MessageDTO, WorkspaceDTO } from "./entities";
import { openDatabase } from "./sqlite/open";
import { FaqsRepo } from "./repos/faqs-repo";
import { MessagesRepo } from "./repos/messages-repo";
import { SessionsRepo } from "./repos/sessions-repo";
import { ToolCallsRepo } from "./repos/tool-calls-repo";
import { UsersRepo } from "./repos/users-repo";
import { WorkspacesRepo } from "./repos/workspaces-repo";

export type StreammeoStoreInit = Readonly<{
  databasePath: string;
  /** When true, skip mkdir and use an existing in-memory handle (tests). */
  db?: Database | undefined;
}>;

export class StreammeoStore {
  readonly users: UsersRepo;
  readonly workspaces: WorkspacesRepo;
  readonly sessions: SessionsRepo;
  readonly messages: MessagesRepo;
  readonly toolCalls: ToolCallsRepo;
  readonly faqs: FaqsRepo;

  private readonly db: Database;
  private readonly ownsDb: boolean;

  constructor(db: Database, ownsDb: boolean) {
    this.db = db;
    this.ownsDb = ownsDb;
    this.users = new UsersRepo(db);
    this.workspaces = new WorkspacesRepo(db);
    this.sessions = new SessionsRepo(db);
    this.messages = new MessagesRepo(db);
    this.toolCalls = new ToolCallsRepo(db);
    this.faqs = new FaqsRepo(db);
  }

  /** Close the underlying DB file when this store opened it. */
  close(): void {
    if (this.ownsDb) {
      this.db.close();
    }
  }

  /**
   * Wipes all rows (users cascade to workspaces, sessions, messages, tool_calls, faqs).
   * For local `npm run db:seed` resets only — not for production.
   */
  clearAllData(): void {
    this.db.pragma("foreign_keys = ON");
    this.db.prepare(`DELETE FROM users`).run();
  }

  listMessagesForSessionAsc(sessionId: string): Promise<MessageDTO[]> {
    return this.messages.listForSessionAscending(sessionId);
  }

  recentMessagesForWorkspace(workspaceId: string, limit: number): Promise<MessageDTO[]> {
    return this.messages.recentForWorkspace(workspaceId, limit);
  }

  /**
   * After a completed voice pipeline: finalize session timings and bill minutes.
   */
  async finalizeVoiceTurn(params: Readonly<{
    sessionId: string;
    workspaceId: string;
    endedAt: string;
    durationSec: number;
    minuteDelta: number;
  }>): Promise<WorkspaceDTO | null> {
    const md = Math.max(0, Math.floor(params.minuteDelta));
    const tx = this.db.transaction(() => {
      const s = this.db
        .prepare(
          `UPDATE sessions SET ended_at = ?, duration_sec = ? WHERE id = ? AND workspace_id = ?`,
        )
        .run(params.endedAt, params.durationSec, params.sessionId, params.workspaceId);
      if (s.changes === 0) {
        throw new Error("Session finalize: row missing or wrong workspace");
      }
      if (md > 0) {
        this.db
          .prepare(`UPDATE workspaces SET minutes_used = minutes_used + ? WHERE id = ?`)
          .run(md, params.workspaceId);
      }
    });
    tx();
    return this.workspaces.findById(params.workspaceId);
  }
}

export function createStreammeoStore(init: StreammeoStoreInit): StreammeoStore {
  if (init.db) {
    return new StreammeoStore(init.db, false);
  }
  const db = openDatabase(init.databasePath);
  return new StreammeoStore(db, true);
}
