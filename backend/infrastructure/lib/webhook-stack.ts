import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, "..", "..");

export class WebhookStack extends cdk.Stack {
  readonly appSyncApi: appsync.GraphqlApi;
  readonly httpApi: apigwv2.HttpApi;
  readonly webhookHandler: NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.appSyncApi = new appsync.GraphqlApi(this, "RealtimeApi", {
      name: "streammeo-webhook-realtime",
      schema: appsync.SchemaFile.fromAsset(path.join(here, "graphql", "schema.graphql")),
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

    const env: Record<string, string> = {
      NODE_ENV: "production",
      JWT_SECRET: process.env.JWT_SECRET ?? "change-me-change-me-change-me",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
      FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
      BREVO_API_KEY: process.env.BREVO_API_KEY ?? "",
      BREVO_WEBHOOK_SECRET: process.env.BREVO_WEBHOOK_SECRET ?? "",
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? "",
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? "",
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
      APPSYNC_GRAPHQL_URL: this.appSyncApi.graphqlUrl,
      APPSYNC_API_KEY: this.appSyncApi.apiKey ?? "",
    };

    this.webhookHandler = new NodejsFunction(this, "WebhookHandler", {
      entry: path.join(backendRoot, "src", "lambda", "webhook-handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(29),
      environment: env,
      depsLockFilePath: path.join(backendRoot, "package-lock.json"),
      bundling: {
        minify: true,
        sourceMap: false,
        format: OutputFormat.CJS,
        target: "node20",
        nodeModules: ["@prisma/client", "@streammeo/db", "@streammeo/shared"],
        commandHooks: {
          beforeBundling(): string[] {
            return [`cd ${path.join(backendRoot, "packages", "db")} && npx prisma generate`];
          },
          beforeInstall(): string[] {
            return [];
          },
          afterBundling(): string[] {
            return [];
          },
        },
      },
    });

    this.httpApi = new apigwv2.HttpApi(this, "WebhookHttpApi", {
      apiName: "streammeo-webhook-api",
      corsPreflight: {
        allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowOrigins: ["*"],
        allowHeaders: ["*"],
      },
    });

    const webhookIntegration = new integrations.HttpLambdaIntegration(
      "WebhookIntegration",
      this.webhookHandler,
    );

    for (const route of [
      "/api/v1/webhooks/email/inbound",
      "/api/v1/webhooks/email/status",
      "/api/v1/billing/webhook",
    ]) {
      this.httpApi.addRoutes({
        path: route,
        methods: [apigwv2.HttpMethod.POST],
        integration: webhookIntegration,
      });
    }

    new cdk.CfnOutput(this, "WebhookApiUrl", {
      value: this.httpApi.apiEndpoint,
      description: "Point Brevo and Razorpay webhooks here (append route path)",
    });
    new cdk.CfnOutput(this, "AppSyncGraphqlUrl", {
      value: this.appSyncApi.graphqlUrl,
      description: "AppSync GraphQL endpoint for realtime webhook fan-out",
    });
    new cdk.CfnOutput(this, "AppSyncApiKey", {
      value: this.appSyncApi.apiKey ?? "",
      description: "AppSync API key (also injected into webhook Lambda)",
    });
  }
}
