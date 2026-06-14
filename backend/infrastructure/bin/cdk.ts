#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack.js";

const app = new cdk.App();

new ApiStack(app, "StreammeoApi", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? "ap-south-1",
  },
  description: "Streammeo API Lambda + AppSync realtime + SLA scheduler",
});
