import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { envFilePath, infraDir } from "./load-env.mjs";

const outputsPath = resolve(infraDir, "cdk-outputs.json");

if (!existsSync(outputsPath)) {
  console.warn("[cdk] No cdk-outputs.json — run deploy first.");
  process.exit(0);
}

const outputs = JSON.parse(readFileSync(outputsPath, "utf8"));
const stackOutputs = outputs.StreammeoApi ?? outputs[Object.keys(outputs)[0]];

if (!stackOutputs) {
  console.warn("[cdk] cdk-outputs.json has no stack outputs.");
  process.exit(0);
}

console.log("\n[cdk] Stack outputs\n");

const apiUrl = stackOutputs.ApiUrl;
const appSyncUrl = stackOutputs.AppSyncGraphqlUrl;
const appSyncKey = stackOutputs.AppSyncApiKey;
const uploadsBucket = stackOutputs.UploadsBucketName;
const uploadsCdnUrl = stackOutputs.UploadsCdnUrl;
const emailQueueUrl = stackOutputs.EmailQueueUrl;
const dynamoTable = stackOutputs.DynamoDbTableName;

if (apiUrl) console.log(`  ApiUrl              ${apiUrl}`);
if (dynamoTable) console.log(`  DynamoDbTableName   ${dynamoTable}`);
if (appSyncUrl) console.log(`  AppSyncGraphqlUrl   ${appSyncUrl}`);
if (appSyncKey) console.log(`  AppSyncApiKey       ${appSyncKey}`);
if (uploadsBucket) console.log(`  UploadsBucketName   ${uploadsBucket}`);
if (uploadsCdnUrl) console.log(`  UploadsCdnUrl       ${uploadsCdnUrl}`);
if (emailQueueUrl) console.log(`  EmailQueueUrl       ${emailQueueUrl}`);

console.log(`\n[cdk] Add to ${envFilePath}:\n`);

if (apiUrl) console.log(`VITE_API_URL=${apiUrl}`);
if (appSyncUrl) {
  console.log(`APPSYNC_GRAPHQL_URL=${appSyncUrl}`);
  console.log(`VITE_APPSYNC_GRAPHQL_URL=${appSyncUrl}`);
}
if (appSyncKey) {
  console.log(`APPSYNC_API_KEY=${appSyncKey}`);
  console.log(`VITE_APPSYNC_API_KEY=${appSyncKey}`);
}
if (uploadsBucket) console.log(`UPLOADS_BUCKET=${uploadsBucket}`);
if (uploadsCdnUrl) console.log(`UPLOADS_CDN_URL=${uploadsCdnUrl}`);
if (emailQueueUrl) console.log(`EMAIL_QUEUE_URL=${emailQueueUrl}`);
if (dynamoTable) console.log(`DYNAMODB_TABLE_NAME=${dynamoTable}`);

console.log("");
