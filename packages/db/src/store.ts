import type { Db, MongoClient } from "mongodb";
import type { MessageDTO, WorkspaceDTO } from "./entities";
import { connectMongo } from "./mongo/connect";
import { FaqsRepo } from "./repos/faqs-repo";
import { MessagesRepo } from "./repos/messages-repo";
import { SessionsRepo } from "./repos/sessions-repo";
import { ToolCallsRepo } from "./repos/tool-calls-repo";
import { UsersRepo } from "./repos/users-repo";
import { WorkspacesRepo } from "./repos/workspaces-repo";

export type StreammeoStoreInit = Readonly<{
  mongoUri: string;
  /** Overrides database name from the URI path (default: `streammeo` when URI has no path). */
  dbName?: string | undefined;
}>;

export class StreammeoStore {
  readonly users: UsersRepo;
  readonly workspaces: WorkspacesRepo;
  readonly sessions: SessionsRepo;
  readonly messages: MessagesRepo;
  readonly toolCalls: ToolCallsRepo;
  readonly faqs: FaqsRepo;

  private readonly client: MongoClient;
  private readonly db: Db;
  private readonly ownsClient: boolean;

  constructor(client: MongoClient, db: Db, ownsClient: boolean) {
    this.client = client;
    this.db = db;
    this.ownsClient = ownsClient;
    this.users = new UsersRepo(db);
    this.workspaces = new WorkspacesRepo(db);
    this.sessions = new SessionsRepo(db);
    this.messages = new MessagesRepo(db);
    this.toolCalls = new ToolCallsRepo(db);
    this.faqs = new FaqsRepo(db);
  }

  /** Close the client when this store created the connection. */
  async close(): Promise<void> {
    if (this.ownsClient) {
      await this.client.close();
    }
  }

  /**
   * Wipes all documents in app collections. For `npm run db:seed` resets only — not for production.
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.db.collection("messages").deleteMany({}),
      this.db.collection("toolCalls").deleteMany({}),
      this.db.collection("faqs").deleteMany({}),
      this.db.collection("sessions").deleteMany({}),
      this.db.collection("workspaces").deleteMany({}),
      this.db.collection("users").deleteMany({}),
    ]);
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
    type SessionRow = Readonly<{
      _id: string;
      workspaceId: string;
      endedAt: string | null;
      durationSec: number;
    }>;
    type WorkspaceRow = Readonly<{ _id: string }>;
    const sessions = this.db.collection<SessionRow>("sessions");
    const workspaces = this.db.collection<WorkspaceRow>("workspaces");

    const s = await sessions.updateOne(
      { _id: params.sessionId, workspaceId: params.workspaceId },
      { $set: { endedAt: params.endedAt, durationSec: params.durationSec } },
    );
    if (s.matchedCount === 0) {
      throw new Error("Session finalize: row missing or wrong workspace");
    }
    if (md > 0) {
      await workspaces.updateOne({ _id: params.workspaceId }, { $inc: { minutesUsed: md } });
    }
    return this.workspaces.findById(params.workspaceId);
  }
}

export async function createStreammeoStore(init: StreammeoStoreInit): Promise<StreammeoStore> {
  const { client, db } = await connectMongo(init.mongoUri, init.dbName);
  return new StreammeoStore(client, db, true);
}
