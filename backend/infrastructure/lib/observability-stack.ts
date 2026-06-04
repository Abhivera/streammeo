import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import type { ApiStack } from "./api-stack.js";

export class ObservabilityStack extends Construct {
  constructor(scope: Construct, id: string, api: ApiStack) {
    super(scope, id);

    new cloudwatch.Dashboard(this, "OpsDashboard", {
      dashboardName: "streammeo-ops",
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: "HTTP API Requests",
            left: [
              new cloudwatch.Metric({
                namespace: "AWS/ApiGateway",
                metricName: "Count",
                dimensionsMap: { ApiId: api.httpApi.apiId },
                statistic: "sum",
              }),
            ],
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: "Voice Turn Lambda Duration (p95)",
            left: [api.voiceHandler.metricDuration({ statistic: "p95" })],
          }),
          new cloudwatch.GraphWidget({
            title: "Lambda Errors",
            left: [api.apiHandler.metricErrors(), api.voiceHandler.metricErrors()],
          }),
        ],
      ],
    });
  }
}
