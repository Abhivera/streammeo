import { createStreammeoStore, type StreammeoStore } from "@streammeo/db";
import type { AppConfig } from "./config";

let store: StreammeoStore | undefined;

export function initStore(config: AppConfig): void {
  store = createStreammeoStore({
    databasePath: config.SQLITE_PATH,
  });
}

export function getStore(): StreammeoStore {
  if (!store) {
    throw new Error("Data store not initialized — call initStore() at startup");
  }
  return store;
}
