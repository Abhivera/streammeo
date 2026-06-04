import {
  DynamoDBClient,
  type DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { MessageDTO, WorkspaceDTO } from "./entities";
import type { SessionCursor, WorkspacePatch } from "./types";
import { toFaqDTO, toMessageDTO, toSessionDTO, toToolCallDTO, toUserDTO, toWorkspaceDTO } from "./mappers";

export type StreammeoStoreInit = Readonly<{
  region?: string;
  endpoint?: string;
  credentials?: DynamoDBClientConfig["credentials"];
  usersTable: string;
  workspacesTable: string;
  sessionsTable: string;
  messagesTable: string;
  toolCallsTable: string;
  faqsTable: string;
}>;

export class StreammeoStore {
  readonly users: {
    findById: (id: string) => Promise<ReturnType<typeof toUserDTO> | null>;
    findByEmail: (email: string) => Promise<ReturnType<typeof toUserDTO> | null>;
    findByFirebaseUid: (firebaseUid: string) => Promise<ReturnType<typeof toUserDTO> | null>;
    createIfAbsent: (user: {
      id: string;
      email: string;
      password: string;
      createdAt: string;
      firebaseUid?: string;
    }) => Promise<void>;
    setFirebaseUid: (userId: string, firebaseUid: string) => Promise<void>;
    deleteByEmail: (email: string) => Promise<void>;
  };
  readonly workspaces: {
    findById: (id: string) => Promise<ReturnType<typeof toWorkspaceDTO> | null>;
    findByApiKey: (apiKey: string) => Promise<ReturnType<typeof toWorkspaceDTO> | null>;
    listByOwner: (ownerId: string) => Promise<ReturnType<typeof toWorkspaceDTO>[]>;
    put: (ws: Omit<ReturnType<typeof toWorkspaceDTO>, "createdAt"> & { createdAt: string }) => Promise<void>;
    update: (id: string, patch: WorkspacePatch) => Promise<ReturnType<typeof toWorkspaceDTO> | null>;
  };
  readonly sessions: {
    findByIdAndWorkspace: (
      sessionId: string,
      workspaceId: string,
    ) => Promise<ReturnType<typeof toSessionDTO> | null>;
    createForWorkspace: (
      workspaceId: string,
      sessionId: string,
    ) => Promise<ReturnType<typeof toSessionDTO>>;
    patch: (
      sessionId: string,
      patch: Partial<Pick<ReturnType<typeof toSessionDTO>, "endedAt" | "durationSec" | "resolved">>,
    ) => Promise<void>;
    markEndedIfOpen: (sessionId: string) => Promise<void>;
    addMessageCount: (sessionId: string, delta: number) => Promise<void>;
    listByWorkspacePage: (
      workspaceId: string,
      limit: number,
      exclusiveStartKey?: SessionCursor | undefined,
    ) => Promise<{ items: ReturnType<typeof toSessionDTO>[]; nextKey?: SessionCursor }>;
    listAllByWorkspace: (workspaceId: string) => Promise<ReturnType<typeof toSessionDTO>[]>;
  };
  readonly messages: {
    put: (m: Omit<ReturnType<typeof toMessageDTO>, "createdAt"> & { createdAtMs: number }) => Promise<void>;
    listForSessionAscending: (sessionId: string) => Promise<ReturnType<typeof toMessageDTO>[]>;
    recentForWorkspace: (workspaceId: string, limit: number) => Promise<ReturnType<typeof toMessageDTO>[]>;
  };
  readonly toolCalls: {
    put: (tc: Omit<ReturnType<typeof toToolCallDTO>, "createdAt"> & { createdAtMs: number }) => Promise<void>;
    listForSessionAscending: (sessionId: string) => Promise<ReturnType<typeof toToolCallDTO>[]>;
  };
  readonly faqs: {
    put: (
      f: Omit<ReturnType<typeof toFaqDTO>, "embedding" | "createdAt"> & {
        embedding?: number[];
        createdAtMs: number;
      },
    ) => Promise<ReturnType<typeof toFaqDTO>>;
    listByWorkspaceDescending: (workspaceId: string) => Promise<ReturnType<typeof toFaqDTO>[]>;
    delete: (workspaceId: string, id: string) => Promise<boolean>;
    update: (
      workspaceId: string,
      id: string,
      patch: Pick<ReturnType<typeof toFaqDTO>, "question" | "answer">,
    ) => Promise<ReturnType<typeof toFaqDTO> | null>;
  };

  private readonly doc: DynamoDBDocumentClient;
  private readonly tables: Omit<StreammeoStoreInit, "region" | "endpoint" | "credentials">;

  constructor(doc: DynamoDBDocumentClient, init: StreammeoStoreInit) {
    this.doc = doc;
    this.tables = {
      usersTable: init.usersTable,
      workspacesTable: init.workspacesTable,
      sessionsTable: init.sessionsTable,
      messagesTable: init.messagesTable,
      toolCallsTable: init.toolCallsTable,
      faqsTable: init.faqsTable,
    };

    this.users = {
      findById: async (id) => {
        const res = await this.doc.send(
          new GetCommand({ TableName: this.tables.usersTable, Key: { id } }),
        );
        return res.Item ? toUserDTO(res.Item) : null;
      },
      findByEmail: async (email) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.usersTable,
            IndexName: "EmailIndex",
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: { ":email": email.toLowerCase().trim() },
            Limit: 1,
          }),
        );
        return res.Items?.[0] ? toUserDTO(res.Items[0]) : null;
      },
      findByFirebaseUid: async (firebaseUid) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.usersTable,
            IndexName: "FirebaseUidIndex",
            KeyConditionExpression: "firebaseUid = :uid",
            ExpressionAttributeValues: { ":uid": firebaseUid },
            Limit: 1,
          }),
        );
        return res.Items?.[0] ? toUserDTO(res.Items[0]) : null;
      },
      createIfAbsent: async (user) => {
        await this.doc.send(
          new PutCommand({
            TableName: this.tables.usersTable,
            Item: { ...user, email: user.email.toLowerCase().trim() },
            ConditionExpression: "attribute_not_exists(id)",
          }),
        );
      },
      setFirebaseUid: async (userId, firebaseUid) => {
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tables.usersTable,
            Key: { id: userId },
            UpdateExpression: "SET firebaseUid = :firebaseUid",
            ExpressionAttributeValues: { ":firebaseUid": firebaseUid },
          }),
        );
      },
      deleteByEmail: async (email) => {
        const user = await this.users.findByEmail(email);
        if (!user) return;
        await this.doc.send(
          new DeleteCommand({ TableName: this.tables.usersTable, Key: { id: user.id } }),
        );
      },
    };

    this.workspaces = {
      findById: async (id) => {
        const res = await this.doc.send(
          new GetCommand({ TableName: this.tables.workspacesTable, Key: { id } }),
        );
        return res.Item ? toWorkspaceDTO(res.Item) : null;
      },
      findByApiKey: async (apiKey) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.workspacesTable,
            IndexName: "ApiKeyIndex",
            KeyConditionExpression: "apiKey = :apiKey",
            ExpressionAttributeValues: { ":apiKey": apiKey },
            Limit: 1,
          }),
        );
        return res.Items?.[0] ? toWorkspaceDTO(res.Items[0]) : null;
      },
      listByOwner: async (ownerId) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.workspacesTable,
            IndexName: "OwnerIndex",
            KeyConditionExpression: "ownerId = :ownerId",
            ExpressionAttributeValues: { ":ownerId": ownerId },
            ScanIndexForward: true,
          }),
        );
        return (res.Items ?? []).map((item) => toWorkspaceDTO(item));
      },
      put: async (ws) => {
        await this.doc.send(
          new PutCommand({
            TableName: this.tables.workspacesTable,
            Item: {
              ...ws,
              sessionCount: 0,
              shopifyShopDomain: ws.shopifyShopDomain ?? null,
              shopifyAccessToken: ws.shopifyAccessToken ?? null,
            },
            ConditionExpression: "attribute_not_exists(id)",
          }),
        );
      },
      update: async (id, patch) => {
        const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
        if (entries.length === 0) return this.workspaces.findById(id);
        const names: Record<string, string> = {};
        const values: Record<string, unknown> = {};
        const setters: string[] = [];
        let i = 0;
        for (const [key, value] of entries) {
          const name = `#k${i}`;
          const val = `:v${i}`;
          names[name] = key;
          values[val] = value;
          setters.push(`${name} = ${val}`);
          i += 1;
        }
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tables.workspacesTable,
            Key: { id },
            UpdateExpression: `SET ${setters.join(", ")}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          }),
        );
        return this.workspaces.findById(id);
      },
    };

    this.sessions = {
      findByIdAndWorkspace: async (sessionId, workspaceId) => {
        const res = await this.doc.send(
          new GetCommand({
            TableName: this.tables.sessionsTable,
            Key: { id: sessionId },
          }),
        );
        if (!res.Item || res.Item.workspaceId !== workspaceId) return null;
        return toSessionDTO(res.Item);
      },
      createForWorkspace: async (workspaceId, sessionId) => {
        const startedAt = Date.now();
        await this.doc.send(
          new PutCommand({
            TableName: this.tables.sessionsTable,
            Item: {
              id: sessionId,
              workspaceId,
              startedAt,
              endedAt: null,
              durationSec: 0,
              resolved: false,
              messageCount: 0,
            },
            ConditionExpression: "attribute_not_exists(id)",
          }),
        );
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tables.workspacesTable,
            Key: { id: workspaceId },
            UpdateExpression: "SET sessionCount = if_not_exists(sessionCount, :z) + :inc",
            ExpressionAttributeValues: { ":inc": 1, ":z": 0 },
          }),
        );
        const row = await this.sessions.findByIdAndWorkspace(sessionId, workspaceId);
        if (!row) throw new Error("Session create failed unexpectedly");
        return row;
      },
      patch: async (sessionId, patch) => {
        const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
        if (entries.length === 0) return;
        const names: Record<string, string> = {};
        const values: Record<string, unknown> = {};
        const setters: string[] = [];
        let i = 0;
        for (const [key, value] of entries) {
          const n = `#k${i}`;
          const v = `:v${i}`;
          names[n] = key;
          values[v] = value;
          setters.push(`${n} = ${v}`);
          i += 1;
        }
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tables.sessionsTable,
            Key: { id: sessionId },
            UpdateExpression: `SET ${setters.join(", ")}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          }),
        );
      },
      markEndedIfOpen: async (sessionId) => {
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tables.sessionsTable,
            Key: { id: sessionId },
            UpdateExpression: "SET endedAt = if_not_exists(endedAt, :now)",
            ExpressionAttributeValues: { ":now": new Date().toISOString() },
          }),
        );
      },
      addMessageCount: async (sessionId, delta) => {
        if (delta === 0) return;
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tables.sessionsTable,
            Key: { id: sessionId },
            UpdateExpression: "SET messageCount = if_not_exists(messageCount, :z) + :inc",
            ExpressionAttributeValues: { ":inc": delta, ":z": 0 },
          }),
        );
      },
      listByWorkspacePage: async (workspaceId, limit, exclusiveStartKey) => {
        const lim = Math.min(Math.max(limit, 1), 100);
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.sessionsTable,
            IndexName: "WorkspaceStartedAtIndex",
            KeyConditionExpression: "workspaceId = :workspaceId",
            ExpressionAttributeValues: { ":workspaceId": workspaceId },
            ScanIndexForward: false,
            Limit: lim,
            ExclusiveStartKey: exclusiveStartKey
              ? { workspaceId, startedAt: exclusiveStartKey.startedAt, id: exclusiveStartKey.id }
              : undefined,
          }),
        );
        const items = (res.Items ?? []).map((item) => toSessionDTO(item));
        const last = res.Items?.[res.Items.length - 1];
        const nextKey = last ? ({ startedAt: last.startedAt, id: last.id } as SessionCursor) : undefined;
        return { items, ...(res.LastEvaluatedKey && nextKey ? { nextKey } : {}) };
      },
      listAllByWorkspace: async (workspaceId) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.sessionsTable,
            IndexName: "WorkspaceStartedAtIndex",
            KeyConditionExpression: "workspaceId = :workspaceId",
            ExpressionAttributeValues: { ":workspaceId": workspaceId },
            ScanIndexForward: false,
          }),
        );
        return (res.Items ?? []).map((item) => toSessionDTO(item));
      },
    };

    this.messages = {
      put: async (m) => {
        await this.doc.send(
          new PutCommand({
            TableName: this.tables.messagesTable,
            Item: {
              sessionId: m.sessionId,
              sk: `${m.createdAtMs}#${m.id}`,
              messageId: m.id,
              workspaceId: m.workspaceId,
              role: m.role,
              text: m.text,
              audioUrl: m.audioUrl,
              createdAt: m.createdAtMs,
            },
          }),
        );
      },
      listForSessionAscending: async (sessionId) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.messagesTable,
            KeyConditionExpression: "sessionId = :sessionId",
            ExpressionAttributeValues: { ":sessionId": sessionId },
            ScanIndexForward: true,
          }),
        );
        return (res.Items ?? []).map((item) =>
          toMessageDTO({
            id: item.messageId,
            sessionId: item.sessionId,
            workspaceId: item.workspaceId,
            role: item.role,
            text: item.text,
            audioUrl: item.audioUrl,
            createdAt: item.createdAt,
          }),
        );
      },
      recentForWorkspace: async (workspaceId, limit) => {
        const lim = Math.min(limit, 500);
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.messagesTable,
            IndexName: "WorkspaceCreatedAtIndex",
            KeyConditionExpression: "workspaceId = :workspaceId",
            ExpressionAttributeValues: { ":workspaceId": workspaceId },
            ScanIndexForward: false,
            Limit: lim,
          }),
        );
        return (res.Items ?? []).map((item) =>
          toMessageDTO({
            id: item.messageId,
            sessionId: item.sessionId,
            workspaceId: item.workspaceId,
            role: item.role,
            text: item.text,
            audioUrl: item.audioUrl,
            createdAt: item.createdAt,
          }),
        );
      },
    };

    this.toolCalls = {
      put: async (tc) => {
        await this.doc.send(
          new PutCommand({
            TableName: this.tables.toolCallsTable,
            Item: {
              sessionId: tc.sessionId,
              sk: `${tc.createdAtMs}#${tc.id}`,
              toolCallId: tc.id,
              toolName: tc.toolName,
              input: tc.input,
              output: tc.output,
              createdAt: tc.createdAtMs,
            },
          }),
        );
      },
      listForSessionAscending: async (sessionId) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.toolCallsTable,
            KeyConditionExpression: "sessionId = :sessionId",
            ExpressionAttributeValues: { ":sessionId": sessionId },
            ScanIndexForward: true,
          }),
        );
        return (res.Items ?? []).map((item) =>
          toToolCallDTO({
            id: item.toolCallId,
            sessionId: item.sessionId,
            toolName: item.toolName,
            input: item.input,
            output: item.output,
            createdAt: item.createdAt,
          }),
        );
      },
    };

    this.faqs = {
      put: async (f) => {
        const item = {
          workspaceId: f.workspaceId,
          faqId: f.id,
          question: f.question,
          answer: f.answer,
          embedding: f.embedding ?? [],
          createdAt: f.createdAtMs,
        };
        await this.doc.send(new PutCommand({ TableName: this.tables.faqsTable, Item: item }));
        return toFaqDTO({
          id: item.faqId,
          workspaceId: item.workspaceId,
          question: item.question,
          answer: item.answer,
          embedding: item.embedding,
          createdAt: item.createdAt,
        });
      },
      listByWorkspaceDescending: async (workspaceId) => {
        const res = await this.doc.send(
          new QueryCommand({
            TableName: this.tables.faqsTable,
            IndexName: "WorkspaceCreatedAtIndex",
            KeyConditionExpression: "workspaceId = :workspaceId",
            ExpressionAttributeValues: { ":workspaceId": workspaceId },
            ScanIndexForward: false,
          }),
        );
        return (res.Items ?? []).map((item) =>
          toFaqDTO({
            id: item.faqId,
            workspaceId: item.workspaceId,
            question: item.question,
            answer: item.answer,
            embedding: item.embedding,
            createdAt: item.createdAt,
          }),
        );
      },
      delete: async (workspaceId, id) => {
        await this.doc.send(
          new DeleteCommand({
            TableName: this.tables.faqsTable,
            Key: { workspaceId, faqId: id },
          }),
        );
        return true;
      },
      update: async (workspaceId, id, patch) => {
        await this.doc.send(
          new UpdateCommand({
            TableName: this.tables.faqsTable,
            Key: { workspaceId, faqId: id },
            UpdateExpression: "SET question = :q, answer = :a",
            ExpressionAttributeValues: { ":q": patch.question, ":a": patch.answer },
          }),
        );
        const res = await this.doc.send(
          new GetCommand({
            TableName: this.tables.faqsTable,
            Key: { workspaceId, faqId: id },
          }),
        );
        return res.Item
          ? toFaqDTO({
              id: res.Item.faqId,
              workspaceId: res.Item.workspaceId,
              question: res.Item.question,
              answer: res.Item.answer,
              embedding: res.Item.embedding,
              createdAt: res.Item.createdAt,
            })
          : null;
      },
    };
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Wipes all rows in app tables. For `npm run db:seed` resets only — not for production.
   */
  async clearAllData(): Promise<void> {
    const targets: ReadonlyArray<{ table: string; keys: readonly string[] }> = [
      { table: this.tables.usersTable, keys: ["id"] },
      { table: this.tables.workspacesTable, keys: ["id"] },
      { table: this.tables.sessionsTable, keys: ["id"] },
      { table: this.tables.messagesTable, keys: ["sessionId", "sk"] },
      { table: this.tables.toolCallsTable, keys: ["sessionId", "sk"] },
      { table: this.tables.faqsTable, keys: ["workspaceId", "faqId"] },
    ];
    const scanAndDelete = async (tableName: string, keys: readonly string[]): Promise<void> => {
      const scan = await this.doc.send(
        new ScanCommand({ TableName: tableName, ProjectionExpression: keys.join(", ") }),
      );
      await Promise.all(
        (scan.Items ?? []).map((item) => {
          const Key = Object.fromEntries(keys.map((k) => [k, item[k]]));
          return this.doc.send(new DeleteCommand({ TableName: tableName, Key }));
        }),
      );
    };
    await Promise.all(targets.map((t) => scanAndDelete(t.table, t.keys)));
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
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tables.sessionsTable,
        Key: { id: params.sessionId },
        UpdateExpression: "SET endedAt = :endedAt, durationSec = :durationSec",
        ConditionExpression: "workspaceId = :workspaceId",
        ExpressionAttributeValues: {
          ":endedAt": params.endedAt,
          ":durationSec": params.durationSec,
          ":workspaceId": params.workspaceId,
        },
      }),
    );
    if (md > 0) {
      await this.doc.send(
        new UpdateCommand({
          TableName: this.tables.workspacesTable,
          Key: { id: params.workspaceId },
          UpdateExpression: "SET minutesUsed = if_not_exists(minutesUsed, :z) + :inc",
          ExpressionAttributeValues: { ":inc": md, ":z": 0 },
        }),
      );
    }
    return this.workspaces.findById(params.workspaceId);
  }
}

export async function createStreammeoStore(init: StreammeoStoreInit): Promise<StreammeoStore> {
  const dynamo = new DynamoDBClient({
    region: init.region,
    endpoint: init.endpoint,
    credentials: init.credentials,
  });
  const doc = DynamoDBDocumentClient.from(dynamo, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
  return new StreammeoStore(doc, init);
}
