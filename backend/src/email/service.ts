import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { z } from "zod";
import type { AppConfig } from "../config.js";

export const outboundEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50_000),
  from: z.string().email(),
});

export type OutboundEmailInput = z.infer<typeof outboundEmailSchema>;

export type SendOutboundEmailResult = {
  sent: boolean;
  queued?: boolean;
  provider?: string;
};

let sqsClient: SQSClient | null = null;

function getSqsClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
  }
  return sqsClient;
}

export async function deliverOutboundEmail(
  config: AppConfig,
  input: OutboundEmailInput,
): Promise<void> {
  if (!config.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": config.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: input.from, name: "Streammeo Support" },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status}`);
  }
}

async function enqueueOutboundEmail(
  config: AppConfig,
  input: OutboundEmailInput,
): Promise<void> {
  if (!config.EMAIL_QUEUE_URL) {
    throw new Error("EMAIL_QUEUE_URL is not configured");
  }

  await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: config.EMAIL_QUEUE_URL,
      MessageBody: JSON.stringify(input),
    }),
  );
}

export async function sendOutboundEmail(
  config: AppConfig,
  input: OutboundEmailInput,
): Promise<SendOutboundEmailResult> {
  const parsed = outboundEmailSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid outbound email payload");
  }

  if (config.EMAIL_QUEUE_URL) {
    await enqueueOutboundEmail(config, parsed.data);
    return { sent: true, queued: true, provider: "sqs" };
  }

  if (!config.BREVO_API_KEY) {
    return { sent: false, provider: "stub" };
  }

  await deliverOutboundEmail(config, parsed.data);
  return { sent: true, provider: "brevo" };
}
