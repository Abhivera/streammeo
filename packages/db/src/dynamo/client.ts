import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export type DocClientDeps = Readonly<{
  region: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
}>;

export function createDocumentClient(deps: DocClientDeps): DynamoDBDocumentClient {
  const dynamo = new DynamoDBClient({
    region: deps.region,
    ...(deps.endpoint ? { endpoint: deps.endpoint } : {}),
    ...(deps.credentials ? { credentials: deps.credentials } : {}),
  });
  return DynamoDBDocumentClient.from(dynamo, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
}
