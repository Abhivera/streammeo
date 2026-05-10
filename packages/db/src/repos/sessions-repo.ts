import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { SessionDTO } from "../entities";
import { GSI } from "../dynamo/keys";
import { toSessionDTO } from "../mappers";

export type SessionCursor = Readonly<
  Record<string, unknown>
>;

export class SessionsRepo {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly table: string,
    private readonly workspacesTable: string,
  ) {}

  async findByIdAndWorkspace(
    sessionId: string,
    workspaceId: string,
  ): Promise<SessionDTO | null> {
    const res = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { id: sessionId } }),
    );
    const r = res.Item as Record<string, unknown> | undefined;
    if (!r || String(r.workspaceId) !== workspaceId) return null;
    return toSessionDTO(r);
  }

  /** Create voice session row and bump workspace session counter (TransactWrite). */
  async createForWorkspace(workspaceId: string, sessionId: string): Promise<SessionDTO> {
    const startedAt = Date.now();
    await this.doc.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.table,
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
            },
          },
          {
            Update: {
              TableName: this.workspacesTable,
              Key: { id: workspaceId },
              UpdateExpression: "ADD sessionCount :one",
              ExpressionAttributeValues: { ":one": 1 },
              ConditionExpression: "attribute_exists(id)",
            },
          },
        ],
      }),
    );

    const row = await this.findByIdAndWorkspace(sessionId, workspaceId);
    if (!row) throw new Error("Session create failed unexpectedly");
    return row;
  }

  async patch(
    sessionId: string,
    patch: Partial<Pick<SessionDTO, "endedAt" | "durationSec" | "resolved">>,
  ): Promise<void> {
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const parts: string[] = [];
    let i = 0;
    if (patch.endedAt !== undefined) {
      names[`#e${i}`] = "endedAt";
      values[`:v${i}`] = patch.endedAt;
      parts.push(`#e${i} = :v${i}`);
      i++;
    }
    if (patch.durationSec !== undefined) {
      names[`#e${i}`] = "durationSec";
      values[`:v${i}`] = patch.durationSec;
      parts.push(`#e${i} = :v${i}`);
      i++;
    }
    if (patch.resolved !== undefined) {
      names[`#e${i}`] = "resolved";
      values[`:v${i}`] = patch.resolved;
      parts.push(`#e${i} = :v${i}`);
      i++;
    }
    if (parts.length === 0) return;

    await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { id: sessionId },
        UpdateExpression: `SET ${parts.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
  }

  /** Only sets endedAt if still absent (disconnect race). */
  async markEndedIfOpen(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { id: sessionId },
        UpdateExpression: "SET endedAt = :e",
        ConditionExpression: "attribute_not_exists(endedAt)",
        ExpressionAttributeValues: { ":e": now },
      }),
    ).catch(() => undefined);
  }

  async addMessageCount(sessionId: string, delta: number): Promise<void> {
    if (delta === 0) return;
    await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { id: sessionId },
        UpdateExpression: "ADD messageCount :d",
        ExpressionAttributeValues: { ":d": delta },
      }),
    );
  }

  async listByWorkspacePage(
    workspaceId: string,
    limit: number,
    exclusiveStartKey?: SessionCursor | undefined,
  ): Promise<{ items: SessionDTO[]; nextKey?: SessionCursor }> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: GSI.sessionWorkspaceTime,
        KeyConditionExpression: "workspaceId = :w",
        ExpressionAttributeValues: { ":w": workspaceId },
        Limit: Math.min(Math.max(limit, 1), 100),
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey as never,
      }),
    );
    const items = (res.Items ?? []).map((it: Record<string, unknown>) =>
      toSessionDTO(it),
    );
    const nextKey = res.LastEvaluatedKey as SessionCursor | undefined;
    return { items, ...(nextKey ? { nextKey } : {}) };
  }

  /** Full scan via GSI (moderate workspaces only). Analytics & totals. */
  async listAllByWorkspace(workspaceId: string): Promise<SessionDTO[]> {
    const out: SessionDTO[] = [];
    let startKey: SessionCursor | undefined;
    do {
      const res = await this.doc.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: GSI.sessionWorkspaceTime,
          KeyConditionExpression: "workspaceId = :w",
          ExpressionAttributeValues: { ":w": workspaceId },
          ExclusiveStartKey: startKey as never,
        }),
      );
      for (const it of res.Items ?? []) {
        out.push(toSessionDTO(it as Record<string, unknown>));
      }
      startKey = res.LastEvaluatedKey as SessionCursor | undefined;
    } while (startKey);
    return out;
  }
}
