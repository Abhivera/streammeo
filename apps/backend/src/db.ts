import { createVoiceWidgetStore, type VoiceWidgetStore } from "@voicewidget/db";
import type { AppConfig } from "./config";
import { dynamoCredentialPair } from "./config";

let store: VoiceWidgetStore | undefined;

export function initStore(config: AppConfig): void {
  store = createVoiceWidgetStore({
    region: config.AWS_REGION,
    endpoint: config.DYNAMODB_ENDPOINT,
    credentials: dynamoCredentialPair(config),
    tablePrefix: config.DYNAMODB_TABLE_PREFIX,
  });
}

export function getStore(): VoiceWidgetStore {
  if (!store) {
    throw new Error("Data store not initialized — call initStore() at startup");
  }
  return store;
}
