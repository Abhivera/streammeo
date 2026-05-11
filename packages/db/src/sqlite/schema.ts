import type { Database } from "better-sqlite3";

/** Idempotent DDL for local SQLite persistence. */
export function ensureSchema(db: Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      language TEXT NOT NULL DEFAULT 'en',
      agent_name TEXT NOT NULL DEFAULT 'Alex',
      system_prompt TEXT NOT NULL DEFAULT '',
      /* Legacy label; unused in prototype UI. */
      plan TEXT NOT NULL DEFAULT 'free',
      /* Rolled up from sessions; primary usage metric for dashboards and future metering. */
      minutes_used INTEGER NOT NULL DEFAULT 0,
      /* 0 = no cap. When you add metered billing, set a cap and keep minutes_used as source of truth. */
      minutes_limit INTEGER NOT NULL DEFAULT 0,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shopify_shop_domain TEXT,
      shopify_access_token TEXT,
      session_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      started_at INTEGER NOT NULL,
      ended_at TEXT,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      resolved INTEGER NOT NULL DEFAULT 0,
      message_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_workspace_time
      ON sessions(workspace_id, started_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      audio_url TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_workspace_time
      ON messages(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, id)
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT NOT NULL,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      embedding_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      PRIMARY KEY (workspace_id, id)
    );

    /* One-time style migration: free tier + no hard cap (0 = unlimited). Safe to re-run. */
    UPDATE workspaces SET plan = 'free', minutes_limit = 0
      WHERE plan != 'free' OR minutes_limit != 0;

    /* English-only product: normalize legacy language codes. */
    UPDATE workspaces SET language = 'en' WHERE language IN ('ta', 'hi');
  `);
}
