import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import type { DataStackResources } from "./data-stack.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// infrastructure/ lives inside the backend project, so two levels up from lib/ is the backend root.
const backendRoot = path.join(here, "..", "..");
const lambdaEntry = (file: string): string =>
  path.join(backendRoot, "src", "lambda", file);

export class ApiStack extends Construct {
  readonly appSyncApi: appsync.GraphqlApi;
  readonly httpApi: apigwv2.HttpApi;
  readonly apiHandler: NodejsFunction;
  readonly voiceHandler: NodejsFunction;

  constructor(scope: Construct, id: string, data: DataStackResources) {
    super(scope, id);

    // --- AppSync realtime API (transcript/state fan-out) ---
    this.appSyncApi = new appsync.GraphqlApi(this, "GraphqlApi", {
      name: "streammeo-realtime-api",
      schema: appsync.SchemaFile.fromAsset("lib/graphql/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
      },
      xrayEnabled: true,
    });

    // Local (NONE) resolvers turn mutations into subscription triggers.
    const noneDs = this.appSyncApi.addNoneDataSource("NoneDataSource");
    noneDs.createResolver("PublishVoiceEventResolver", {
      typeName: "Mutation",
      fieldName: "publishVoiceEvent",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`{
  "version": "2017-02-28",
  "payload": {
    "workspaceId": "$context.arguments.workspaceId",
    "sessionId": "$context.arguments.sessionId",
    "role": "$context.arguments.role",
    "text": $util.toJson($context.arguments.text),
    "audioUrl": $util.toJson($context.arguments.audioUrl),
    "createdAt": "$util.time.nowISO8601()"
  }
}`),
      responseMappingTemplate: appsync.MappingTemplate.fromString("$util.toJson($context.result)"),
    });
    noneDs.createResolver("PublishSessionStateResolver", {
      typeName: "Mutation",
      fieldName: "publishSessionState",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`{
  "version": "2017-02-28",
  "payload": {
    "workspaceId": "$context.arguments.workspaceId",
    "sessionId": "$context.arguments.sessionId",
    "state": "$context.arguments.state",
    "updatedAt": "$util.time.nowISO8601()"
  }
}`),
      responseMappingTemplate: appsync.MappingTemplate.fromString("$util.toJson($context.result)"),
    });

    // --- Lambda shared config ---
    const env: Record<string, string> = {
      DYNAMODB_USERS_TABLE: data.usersTable.tableName,
      DYNAMODB_WORKSPACES_TABLE: data.workspacesTable.tableName,
      DYNAMODB_SESSIONS_TABLE: data.sessionsTable.tableName,
      DYNAMODB_MESSAGES_TABLE: data.messagesTable.tableName,
      DYNAMODB_TOOL_CALLS_TABLE: data.toolCallsTable.tableName,
      DYNAMODB_FAQS_TABLE: data.faqsTable.tableName,
      APPSYNC_GRAPHQL_URL: this.appSyncApi.graphqlUrl,
      APPSYNC_API_KEY: this.appSyncApi.apiKey ?? "",
      AUDIO_BUCKET: data.audioBucket.bucketName,
      BEDROCK_MODEL_ID:
        process.env.BEDROCK_MODEL_ID ?? "apac.anthropic.claude-3-5-sonnet-20240620-v1:0",
      TRANSCRIBE_LANGUAGE_CODE: process.env.TRANSCRIBE_LANGUAGE_CODE ?? "en-US",
      POLLY_VOICE_ID: process.env.POLLY_VOICE_ID ?? "Joanna",
      POLLY_ENGINE: process.env.POLLY_ENGINE ?? "neural",
      JWT_SECRET: process.env.JWT_SECRET ?? "change-me-change-me-change-me",
      FRONTEND_URL: process.env.FRONTEND_URL ?? "https://streammeo.vercel.app",
      WIDGET_ALLOWED_ORIGINS: process.env.WIDGET_ALLOWED_ORIGINS ?? "*",
      FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "",
      NODE_ENV: "production",
    };

    const bundling = {
      minify: true,
      sourceMap: false,
      format: OutputFormat.CJS,
      target: "node20",
      // firebase-admin has dynamic requires that break esbuild bundling.
      nodeModules: ["firebase-admin"],
    };
    const depsLockFilePath = path.join(backendRoot, "package-lock.json");

    this.apiHandler = new NodejsFunction(this, "ApiHandler", {
      entry: lambdaEntry("api-handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: env,
      depsLockFilePath,
      bundling,
    });

    this.voiceHandler = new NodejsFunction(this, "VoiceHandler", {
      entry: lambdaEntry("voice-handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(60),
      environment: env,
      depsLockFilePath,
      bundling,
    });

    // --- IAM ---
    for (const fn of [this.apiHandler, this.voiceHandler]) {
      data.usersTable.grantReadWriteData(fn);
      data.workspacesTable.grantReadWriteData(fn);
      data.sessionsTable.grantReadWriteData(fn);
      data.messagesTable.grantReadWriteData(fn);
      data.toolCallsTable.grantReadWriteData(fn);
      data.faqsTable.grantReadWriteData(fn);
    }
    data.audioBucket.grantReadWrite(this.voiceHandler);
    this.voiceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "transcribe:StartStreamTranscription",
          "polly:SynthesizeSpeech",
        ],
        resources: ["*"],
      }),
    );

    // --- HTTP API ---
    this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "streammeo-http-api",
      corsPreflight: {
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ["*"],
        allowHeaders: ["*"],
      },
    });

    // More specific voice route first; the catch-all serves auth/workspace/health.
    this.httpApi.addRoutes({
      path: "/api/v1/voice/{proxy+}",
      methods: [apigwv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration("VoiceIntegration", this.voiceHandler),
    });
    this.httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigwv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration("ApiIntegration", this.apiHandler),
    });
  }
}
