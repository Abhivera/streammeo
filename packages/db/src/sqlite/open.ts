import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { ensureSchema } from "./schema";

export function openDatabase(databasePath: string): InstanceType<typeof Database> {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  ensureSchema(db);
  return db;
}
