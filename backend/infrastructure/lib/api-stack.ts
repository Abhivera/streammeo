import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import { buildApiGatewayCorsOrigins } from "./cors.js";

const infraRoot = process.cwd();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[cdk] Missing required environment variable: ${name}`);
  }
  return value;
}

function lambdaEnv(tableName: string): Record<string, string> {
  return {
    NODE_ENV: "production",
    JWT_SECRET: requireEnv("JWT_SECRET"),
    DYNAMODB_TABLE_NAME: tableName,
    FRONTEND_URL: requireEnv("FRONTEND_URL"),
    WIDGET_ALLOWED_ORIGINS: process.env.WIDGET_ALLOWED_ORIGINS ?? "*",
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "",
    BREVO_API_KEY: process.env.BREVO_API_KEY ?? "",
    BREVO_WEBHOOK_SECRET: process.env.BREVO_WEBHOOK_SECRET ?? "",
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? "",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? "",
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  };
}

function lambdaAsset(name: string): lambda.Code {
  return lambda.Code.fromAsset(path.join(infraRoot, "dist", "lambda", name));
}

export class ApiStack extends cdk.Stack {
  readonly appSyncApi: appsync.GraphqlApi;
  readonly httpApi: apigwv2.HttpApi;
  readonly apiHandler: lambda.Function;
  readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "MainTable", {
      tableName: process.env.DYNAMODB_TABLE_NAME ?? "streammeo",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "gsi2",
      partitionKey: { name: "gsi2pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.appSyncApi = new appsync.GraphqlApi(this, "RealtimeApi", {
      name: "streammeo-realtime",
      schema: appsync.SchemaFile.fromAsset(path.join(infraRoot, "lib", "graphql", "schema.graphql")),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
      },
      xrayEnabled: true,
    });

    const noneDs = this.appSyncApi.addNoneDataSource("NoneDataSource");

    const publishResolver = (fieldName: string, payloadFields: string): void => {
      noneDs.createResolver(`${fieldName}Resolver`, {
        typeName: "Mutation",
        fieldName,
        requestMappingTemplate: appsync.MappingTemplate.fromString(`{
  "version": "2017-02-28",
  "payload": {
    ${payloadFields},
    "createdAt": "$util.time.nowISO8601()"
  }
}`),
        responseMappingTemplate: appsync.MappingTemplate.fromString("$util.toJson($context.result)"),
      });
    };

    publishResolver(
      "publishTicketEvent",
      `"workspaceId": "$context.arguments.workspaceId",
    "ticketId": "$context.arguments.ticketId",
    "eventType": "$context.arguments.eventType",
    "payload": $util.toJson($context.arguments.payload)`,
    );
    publishResolver(
      "publishBillingEvent",
      `"workspaceId": "$context.arguments.workspaceId",
    "plan": "$context.arguments.plan",
    "eventType": "$context.arguments.eventType"`,
    );
    publishResolver(
      "publishEmailStatus",
      `"workspaceId": "$context.arguments.workspaceId",
    "ticketId": $util.toJson($context.arguments.ticketId),
    "status": "$context.arguments.status",
    "payload": $util.toJson($context.arguments.payload)`,
    );

    const uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [{ expiration: cdk.Duration.days(90) }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const uploadsCdn = new cloudfront.Distribution(this, "UploadsCdn", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(uploadsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
    });

    const uploadsCdnUrl = `https://${uploadsCdn.distributionDomainName}`;

    const emailDlq = new sqs.Queue(this, "EmailDlq", {
      retentionPeriod: cdk.Duration.days(14),
    });

    const emailQueue = new sqs.Queue(this, "EmailQueue", {
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: emailDlq,
        maxReceiveCount: 3,
      },
    });

    const env = {
      ...lambdaEnv(this.table.tableName),
      APPSYNC_GRAPHQL_URL: this.appSyncApi.graphqlUrl,
      APPSYNC_API_KEY: this.appSyncApi.apiKey ?? "",
      UPLOADS_BUCKET: uploadsBucket.bucketName,
      UPLOADS_CDN_URL: uploadsCdnUrl,
      EMAIL_QUEUE_URL: emailQueue.queueUrl,
    };

    const sharedLambdaProps: Pick<
      lambda.FunctionProps,
      "runtime" | "memorySize" | "environment" | "handler"
    > = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      environment: env,
      handler: "index.handler",
    };

    this.apiHandler = new lambda.Function(this, "ApiHandler", {
      ...sharedLambdaProps,
      code: lambdaAsset("api-handler"),
      timeout: cdk.Duration.seconds(29),
    });

    const slaChecker = new lambda.Function(this, "SlaChecker", {
      ...sharedLambdaProps,
      code: lambdaAsset("sla-checker"),
      timeout: cdk.Duration.minutes(2),
    });

    const emailWorker = new lambda.Function(this, "EmailWorker", {
      ...sharedLambdaProps,
      code: lambdaAsset("email-worker"),
      timeout: cdk.Duration.seconds(30),
    });

    emailWorker.addEventSource(
      new lambdaEventSources.SqsEventSource(emailQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );

    new events.Rule(this, "SlaCheckerSchedule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(slaChecker)],
    });

    this.table.grantReadWriteData(this.apiHandler);
    this.table.grantReadWriteData(slaChecker);
    uploadsBucket.grantPut(this.apiHandler);
    emailQueue.grantSendMessages(this.apiHandler);

    this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "streammeo-api",
      corsPreflight: {
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        ...buildApiGatewayCorsOrigins(
          requireEnv("FRONTEND_URL"),
          process.env.WIDGET_ALLOWED_ORIGINS,
        ),
        allowHeaders: ["*"],
      },
    });

    const apiIntegration = new integrations.HttpLambdaIntegration("ApiIntegration", this.apiHandler);

    this.httpApi.addRoutes({
      path: "/health",
      methods: [apigwv2.HttpMethod.GET],
      integration: apiIntegration,
    });

    this.httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigwv2.HttpMethod.ANY],
      integration: apiIntegration,
    });

    new cdk.CfnOutput(this, "DynamoDbTableName", {
      value: this.table.tableName,
    });
    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.httpApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, "AppSyncGraphqlUrl", {
      value: this.appSyncApi.graphqlUrl,
    });
    new cdk.CfnOutput(this, "AppSyncApiKey", {
      value: this.appSyncApi.apiKey ?? "",
    });
    new cdk.CfnOutput(this, "UploadsBucketName", {
      value: uploadsBucket.bucketName,
    });
    new cdk.CfnOutput(this, "UploadsCdnUrl", {
      value: uploadsCdnUrl,
    });
    new cdk.CfnOutput(this, "EmailQueueUrl", {
      value: emailQueue.queueUrl,
    });
  }
}

