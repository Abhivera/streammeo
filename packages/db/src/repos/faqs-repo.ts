import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { FaqDTO } from "../entities";
import { toFaqDTO } from "../mappers";

export class FaqsRepo {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly table: string,
  ) {}

  async put(
    f: Readonly<Omit<FaqDTO, "embedding" | "createdAt">> & {
      embedding?: number[];
      createdAtMs: number;
    },
  ): Promise<FaqDTO> {
    const item = {
      workspaceId: f.workspaceId,
      id: f.id,
      question: f.question,
      answer: f.answer,
      embedding: f.embedding ?? [],
      createdAt: f.createdAtMs,
    };
    await this.doc.send(new PutCommand({ TableName: this.table, Item: item }));
    return toFaqDTO(item as Record<string, unknown>);
  }

  async listByWorkspaceDescending(workspaceId: string): Promise<FaqDTO[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "workspaceId = :w",
        ExpressionAttributeValues: { ":w": workspaceId },
      }),
    );
    const rows = (res.Items ?? []).map((it) =>
      toFaqDTO(it as Record<string, unknown>),
    );
    rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return rows;
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    try {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.table,
          Key: { workspaceId, id },
          ConditionExpression: "attribute_exists(id)",
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async update(
    workspaceId: string,
    id: string,
    patch: Pick<FaqDTO, "question" | "answer">,
  ): Promise<FaqDTO | null> {
    try {
      const res = await this.doc.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { workspaceId, id },
          UpdateExpression: "SET question = :q, answer = :a",
          ConditionExpression: "attribute_exists(id)",
          ExpressionAttributeValues: { ":q": patch.question, ":a": patch.answer },
          ReturnValues: "ALL_NEW",
        }),
      );
      const attrs = res.Attributes;
      return attrs ? toFaqDTO(attrs as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}
