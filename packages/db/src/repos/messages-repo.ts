import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { MessageDTO } from "../entities";
import { GSI } from "../dynamo/keys";
import { toMessageDTO } from "../mappers";

export class MessagesRepo {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly table: string,
  ) {}

  async put(m: Readonly<Omit<MessageDTO, "createdAt">> & { createdAtMs: number }>): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: {
          sessionId: m.sessionId,
          id: m.id,
          workspaceId: m.workspaceId,
          role: m.role,
          text: m.text,
          ...(m.audioUrl != null ? { audioUrl: m.audioUrl } : {}),
          createdAt: m.createdAtMs,
        },
      }),
    );
  }

  async listForSessionAscending(sessionId: string): Promise<MessageDTO[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "sessionId = :s",
        ExpressionAttributeValues: { ":s": sessionId },
      }),
    );
    const rows = (res.Items ?? []).map((it) =>
      toMessageDTO(it as Record<string, unknown>),
    );
    rows.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return rows;
  }

  /** Recent rows for aggregation (prefer `role = user`). */
  async recentForWorkspace(workspaceId: string, limit: number): Promise<MessageDTO[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: GSI.messageWorkspaceTime,
        KeyConditionExpression: "workspaceId = :w",
        ExpressionAttributeValues: { ":w": workspaceId },
        Limit: Math.min(limit, 500),
        ScanIndexForward: false,
      }),
    );
    return (res.Items ?? []).map((it) =>
      toMessageDTO(it as Record<string, unknown>),
    );
  }
}
