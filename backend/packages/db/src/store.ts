import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { docClient, getTableName } from "./client.js";

export type DbItem = Record<string, unknown> & { pk: string; sk: string };

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function putItem(item: DbItem): Promise<void> {
  await docClient.send(new PutCommand({ TableName: getTableName(), Item: item }));
}

export async function getItem<T extends DbItem>(pk: string, sk: string): Promise<T | null> {
  const res = await docClient.send(new GetCommand({ TableName: getTableName(), Key: { pk, sk } }));
  return (res.Item as T | undefined) ?? null;
}

export async function deleteItem(pk: string, sk: string): Promise<void> {
  await docClient.send(new DeleteCommand({ TableName: getTableName(), Key: { pk, sk } }));
}

export async function queryPk<T extends DbItem>(
  pk: string,
  skBeginsWith?: string,
  limit?: number,
): Promise<T[]> {
  const input: QueryCommandInput = {
    TableName: getTableName(),
    KeyConditionExpression: skBeginsWith ? "pk = :pk AND begins_with(sk, :sk)" : "pk = :pk",
    ExpressionAttributeValues: skBeginsWith
      ? { ":pk": pk, ":sk": skBeginsWith }
      : { ":pk": pk },
    ...(limit ? { Limit: limit } : {}),
  };
  const res = await docClient.send(new QueryCommand(input));
  return (res.Items as T[]) ?? [];
}

export async function queryGsi1<T extends DbItem>(
  gsi1pk: string,
  opts?: { gsi1skBeginsWith?: string; limit?: number; scanForward?: boolean; exclusiveStartKey?: Record<string, unknown> },
): Promise<{ items: T[]; lastKey?: Record<string, unknown> }> {
  const input: QueryCommandInput = {
    TableName: getTableName(),
    IndexName: "gsi1",
    KeyConditionExpression: opts?.gsi1skBeginsWith
      ? "gsi1pk = :pk AND begins_with(gsi1sk, :sk)"
      : "gsi1pk = :pk",
    ExpressionAttributeValues: opts?.gsi1skBeginsWith
      ? { ":pk": gsi1pk, ":sk": opts.gsi1skBeginsWith }
      : { ":pk": gsi1pk },
    ScanIndexForward: opts?.scanForward ?? true,
    ...(opts?.limit ? { Limit: opts.limit } : {}),
    ...(opts?.exclusiveStartKey ? { ExclusiveStartKey: opts.exclusiveStartKey } : {}),
  };
  const res = await docClient.send(new QueryCommand(input));
  return { items: (res.Items as T[]) ?? [], lastKey: res.LastEvaluatedKey };
}

export async function queryGsi2<T extends DbItem>(
  gsi2pk: string,
  limit?: number,
): Promise<T[]> {
  const items: T[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        IndexName: "gsi2",
        KeyConditionExpression: "gsi2pk = :pk",
        ExpressionAttributeValues: { ":pk": gsi2pk },
        ...(limit ? { Limit: limit } : {}),
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    items.push(...((res.Items as T[]) ?? []));
    exclusiveStartKey = res.LastEvaluatedKey;
    if (limit) break;
  } while (exclusiveStartKey);

  return items;
}

export async function updateItem(
  pk: string,
  sk: string,
  updateExpression: string,
  names: Record<string, string>,
  values: Record<string, unknown>,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { pk, sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

export async function transactWrite(items: Array<{ Put?: DbItem; Delete?: { pk: string; sk: string } }>): Promise<void> {
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: items.map((item) => {
        if (item.Put) return { Put: { TableName: getTableName(), Item: item.Put } };
        if (item.Delete) return { Delete: { TableName: getTableName(), Key: item.Delete } };
        throw new Error("Invalid transact item");
      }),
    }),
  );
}

export async function batchDelete(keys: Array<{ pk: string; sk: string }>): Promise<void> {
  if (keys.length === 0) return;
  for (let i = 0; i < keys.length; i += 25) {
    const chunk = keys.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [getTableName()]: chunk.map((key) => ({ DeleteRequest: { Key: key } })),
        },
      }),
    );
  }
}
