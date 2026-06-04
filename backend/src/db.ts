import { createStreammeoStore, type StreammeoStore } from "@streammeo/db";
import type { AppConfig } from "./config";

let store: StreammeoStore | undefined;

/** Builds the shared `StreammeoStore` backed by DynamoDB tables. */
export async function initStore(config: AppConfig): Promise<void> {
  store = await createStreammeoStore({
    region: config.AWS_REGION,
    ...(config.DYNAMODB_ENDPOINT ? { endpoint: config.DYNAMODB_ENDPOINT } : {}),
    usersTable: config.DYNAMODB_USERS_TABLE,
    workspacesTable: config.DYNAMODB_WORKSPACES_TABLE,
    sessionsTable: config.DYNAMODB_SESSIONS_TABLE,
    messagesTable: config.DYNAMODB_MESSAGES_TABLE,
    toolCallsTable: config.DYNAMODB_TOOL_CALLS_TABLE,
    faqsTable: config.DYNAMODB_FAQS_TABLE,
  });
}

export function getStore(): StreammeoStore {
  if (!store) {
    throw new Error("Data store not initialized — call initStore() at startup");
  }
  return store;
}
