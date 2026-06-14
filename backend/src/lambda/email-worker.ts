import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { parseConfig } from "../config.js";
import { deliverOutboundEmail, outboundEmailSchema } from "../email/service.js";

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const config = parseConfig();
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    try {
      const body = outboundEmailSchema.parse(JSON.parse(record.body));
      await deliverOutboundEmail(config, body);
    } catch (err) {
      console.error(JSON.stringify({ event: "email.worker.failed", messageId: record.messageId, err }));
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
