import { createStreammeoStore, type StreammeoStore } from "@streammeo/db";
import type { AppConfig } from "./config";

let store: StreammeoStore | undefined;

/** Connects to MongoDB (`MONGODB_URI` / optional `MONGODB_DB_NAME`) and builds the shared `StreammeoStore`. */
export async function initStore(config: AppConfig): Promise<void> {
  store = await createStreammeoStore({
    mongoUri: config.MONGODB_URI,
    ...(config.MONGODB_DB_NAME ? { dbName: config.MONGODB_DB_NAME } : {}),
  });
}

export function getStore(): StreammeoStore {
  if (!store) {
    throw new Error("Data store not initialized — call initStore() at startup");
  }
  return store;
}
