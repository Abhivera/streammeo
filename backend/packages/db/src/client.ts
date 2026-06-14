import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const globalForDb = globalThis as unknown as { docClient?: DynamoDBDocumentClient };

function createDocClient(): DynamoDBDocumentClient {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const client = new DynamoDBClient({
    ...(endpoint ? { endpoint, credentials: { accessKeyId: "local", secretAccessKey: "local" } } : {}),
    region: process.env.AWS_REGION ?? process.env.DYNAMODB_REGION ?? "ap-south-1",
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export const docClient = globalForDb.docClient ?? createDocClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.docClient = docClient;
}

export function getTableName(): string {
  return process.env.DYNAMODB_TABLE_NAME ?? "streammeo";
}

export async function disconnect(): Promise<void> {
  docClient.destroy();
}
