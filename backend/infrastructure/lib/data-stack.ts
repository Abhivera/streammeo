import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export type DataStackResources = Readonly<{
  usersTable: dynamodb.Table;
  workspacesTable: dynamodb.Table;
  sessionsTable: dynamodb.Table;
  messagesTable: dynamodb.Table;
  toolCallsTable: dynamodb.Table;
  faqsTable: dynamodb.Table;
  audioBucket: s3.Bucket;
}>;

type Key = Readonly<{ name: string; type: dynamodb.AttributeType }>;
type GsiSpec = Readonly<{ indexName: string; partitionKey: Key; sortKey?: Key }>;
type TableSpec = Readonly<{
  id: string;
  partitionKey: Key;
  sortKey?: Key;
  globalSecondaryIndexes?: readonly GsiSpec[];
}>;

const S = dynamodb.AttributeType.STRING;
const N = dynamodb.AttributeType.NUMBER;

/**
 * Table topology. Child collections (`messages`, `toolCalls`, `faqs`) use native
 * composite keys (parent HASH + sort RANGE) so they can be listed with a single
 * base-table query — no synthetic `parent::child` keys and no extra GSIs.
 */
const TABLE_SPECS: readonly TableSpec[] = [
  {
    id: "UsersTable",
    partitionKey: { name: "id", type: S },
    globalSecondaryIndexes: [
      { indexName: "EmailIndex", partitionKey: { name: "email", type: S } },
      { indexName: "FirebaseUidIndex", partitionKey: { name: "firebaseUid", type: S } },
    ],
  },
  {
    id: "WorkspacesTable",
    partitionKey: { name: "id", type: S },
    globalSecondaryIndexes: [
      { indexName: "ApiKeyIndex", partitionKey: { name: "apiKey", type: S } },
      {
        indexName: "OwnerIndex",
        partitionKey: { name: "ownerId", type: S },
        sortKey: { name: "createdAt", type: S },
      },
    ],
  },
  {
    id: "SessionsTable",
    partitionKey: { name: "id", type: S },
    globalSecondaryIndexes: [
      {
        indexName: "WorkspaceStartedAtIndex",
        partitionKey: { name: "workspaceId", type: S },
        sortKey: { name: "startedAt", type: N },
      },
    ],
  },
  {
    id: "MessagesTable",
    partitionKey: { name: "sessionId", type: S },
    sortKey: { name: "sk", type: S },
    globalSecondaryIndexes: [
      {
        indexName: "WorkspaceCreatedAtIndex",
        partitionKey: { name: "workspaceId", type: S },
        sortKey: { name: "createdAt", type: N },
      },
    ],
  },
  {
    id: "ToolCallsTable",
    partitionKey: { name: "sessionId", type: S },
    sortKey: { name: "sk", type: S },
  },
  {
    id: "FaqsTable",
    partitionKey: { name: "workspaceId", type: S },
    sortKey: { name: "faqId", type: S },
    globalSecondaryIndexes: [
      {
        indexName: "WorkspaceCreatedAtIndex",
        partitionKey: { name: "workspaceId", type: S },
        sortKey: { name: "createdAt", type: N },
      },
    ],
  },
];

export class DataStack extends Construct {
  readonly resources: DataStackResources;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const isProd = process.env.CDK_ENV === "prod";
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    const tables = new Map<string, dynamodb.Table>();
    for (const spec of TABLE_SPECS) {
      const table = new dynamodb.Table(this, spec.id, {
        partitionKey: spec.partitionKey,
        ...(spec.sortKey ? { sortKey: spec.sortKey } : {}),
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
        deletionProtection: isProd,
        removalPolicy,
      });
      for (const gsi of spec.globalSecondaryIndexes ?? []) {
        table.addGlobalSecondaryIndex({
          indexName: gsi.indexName,
          partitionKey: gsi.partitionKey,
          ...(gsi.sortKey ? { sortKey: gsi.sortKey } : {}),
        });
      }
      tables.set(spec.id, table);
    }

    const audioBucket = new s3.Bucket(this, "AudioBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy,
      autoDeleteObjects: !isProd,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [{ expiration: cdk.Duration.days(1) }],
    });

    this.resources = {
      usersTable: tables.get("UsersTable")!,
      workspacesTable: tables.get("WorkspacesTable")!,
      sessionsTable: tables.get("SessionsTable")!,
      messagesTable: tables.get("MessagesTable")!,
      toolCallsTable: tables.get("ToolCallsTable")!,
      faqsTable: tables.get("FaqsTable")!,
      audioBucket,
    };
  }
}
