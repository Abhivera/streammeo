import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { UserDTO } from "../entities";
import { GSI } from "../dynamo/keys";
import { toUserDTO } from "../mappers";

function normEmail(e: string): string {
  return e.toLowerCase().trim();
}

export class UsersRepo {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly table: string,
  ) {}

  async findById(id: string): Promise<UserDTO | null> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: GSI.userByStableId,
        KeyConditionExpression: "id = :i",
        ExpressionAttributeValues: { ":i": id },
        Limit: 1,
      }),
    );
    const r = res.Items?.[0];
    return r ? toUserDTO(r as Record<string, unknown>) : null;
  }

  async findByEmail(email: string): Promise<UserDTO | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.table,
        Key: { email: normEmail(email) },
      }),
    );
    const r = res.Item;
    return r ? toUserDTO(r as Record<string, unknown>) : null;
  }

  async createIfAbsent(user: Readonly<{ id: string; email: string; password: string; createdAt: string }>): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: {
          email: normEmail(user.email),
          id: user.id,
          password: user.password,
          createdAt: user.createdAt,
        },
        ConditionExpression: "attribute_not_exists(email)",
      }),
    );
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.table,
        Key: { email: normEmail(email) },
      }),
    );
  }
}
