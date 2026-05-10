import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { ToolCallDTO } from "../entities";
import { toToolCallDTO } from "../mappers";

export class ToolCallsRepo {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly table: string,
  ) {}

  async put(
    tc: Readonly<Omit<ToolCallDTO, "createdAt">> & { createdAtMs: number },
  ): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: {
          sessionId: tc.sessionId,
          id: tc.id,
          toolName: tc.toolName,
          input: tc.input,
          output: tc.output,
          createdAt: tc.createdAtMs,
        },
      }),
    );
  }

  async listForSessionAscending(sessionId: string): Promise<ToolCallDTO[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "sessionId = :s",
        ExpressionAttributeValues: { ":s": sessionId },
      }),
    );
    const rows = (res.Items ?? []).map((it) =>
      toToolCallDTO(it as Record<string, unknown>),
    );
    rows.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return rows;
  }
}
