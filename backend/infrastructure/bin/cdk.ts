#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { WebhookStack } from "../lib/webhook-stack.js";

const app = new cdk.App();

new WebhookStack(app, "StreammeoWebhooks", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? "ap-south-1",
  },
  description: "Streammeo webhook Lambda + AppSync realtime fan-out",
});
