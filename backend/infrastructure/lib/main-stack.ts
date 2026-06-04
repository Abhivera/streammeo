import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApiStack } from "./api-stack.js";
import { DataStack } from "./data-stack.js";
import { ObservabilityStack } from "./observability-stack.js";
import { WidgetCdnStack } from "./widget-cdn-stack.js";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const data = new DataStack(this, "Data");
    const api = new ApiStack(this, "Api", data.resources);
    const widgetCdn = new WidgetCdnStack(this, "WidgetCdn");
    new ObservabilityStack(this, "Observability", api);

    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: api.httpApi.url ?? "",
    });
    new cdk.CfnOutput(this, "GraphqlApiUrl", {
      value: api.appSyncApi.graphqlUrl,
    });
    new cdk.CfnOutput(this, "GraphqlApiKey", {
      value: api.appSyncApi.apiKey ?? "",
    });
    new cdk.CfnOutput(this, "UsersTableName", {
      value: data.resources.usersTable.tableName,
    });
    new cdk.CfnOutput(this, "WorkspacesTableName", {
      value: data.resources.workspacesTable.tableName,
    });
    new cdk.CfnOutput(this, "SessionsTableName", {
      value: data.resources.sessionsTable.tableName,
    });
    new cdk.CfnOutput(this, "MessagesTableName", {
      value: data.resources.messagesTable.tableName,
    });
    new cdk.CfnOutput(this, "ToolCallsTableName", {
      value: data.resources.toolCallsTable.tableName,
    });
    new cdk.CfnOutput(this, "FaqsTableName", {
      value: data.resources.faqsTable.tableName,
    });
    new cdk.CfnOutput(this, "AudioBucketName", {
      value: data.resources.audioBucket.bucketName,
    });
    new cdk.CfnOutput(this, "WidgetCdnUrl", {
      value: widgetCdn.widgetUrl,
      description: "CloudFront URL of the embeddable widget bundle (use as <script src>).",
    });
    new cdk.CfnOutput(this, "WidgetCdnDomain", {
      value: widgetCdn.distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "WidgetBucketName", {
      value: widgetCdn.bucket.bucketName,
    });
  }
}
