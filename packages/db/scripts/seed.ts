/** Skips when `DEMO_SEED_EMAIL` already exists. See root `.env.example` for AWS/Dynamo env. */

import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { createVoiceWidgetStore } from "../src/store";

function credPair():
  | { accessKeyId: string; secretAccessKey: string }
  | undefined {
  const a = (process.env.AWS_ACCESS_KEY_ID ?? "").trim();
  const s = (process.env.AWS_SECRET_ACCESS_KEY ?? "").trim();
  return a.length > 0 && s.length > 0 ? { accessKeyId: a, secretAccessKey: s } : undefined;
}

const email =
  (process.env.DEMO_SEED_EMAIL ?? "demo@voicewidget.local").toLowerCase().trim();
const password = process.env.DEMO_SEED_PASSWORD ?? "VoiceWidgetDemo!12";
const workspaceName = process.env.DEMO_WORKSPACE_NAME ?? "Demo Workspace";

async function main(): Promise<void> {
  const store = createVoiceWidgetStore({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint:
      typeof process.env.DYNAMODB_ENDPOINT === "string"
      && process.env.DYNAMODB_ENDPOINT.trim().length > 0
        ? process.env.DYNAMODB_ENDPOINT.trim()
        : undefined,
    credentials: credPair(),
    tablePrefix: process.env.DYNAMODB_TABLE_PREFIX ?? "VoiceWidget",
  });

  const existing = await store.users.findByEmail(email);
  if (existing) {
    console.log(`Seed skipped — user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const apiKey =
    `${randomUUID().replace(/-/gu, "")}${randomUUID().replace(/-/gu, "").slice(0, 10)}`;
  const iso = new Date().toISOString();

  await store.users.createIfAbsent({
    id: userId,
    email,
    password: passwordHash,
    createdAt: iso,
  });

  await store.workspaces.put({
    id: workspaceId,
    name: workspaceName,
    apiKey,
    language: "ta",
    agentName: "Priya",
    systemPrompt: "You are a helpful customer support agent.",
    plan: "starter",
    minutesUsed: 0,
    minutesLimit: 500,
    ownerId: userId,
    shopifyShopDomain: null,
    shopifyAccessToken: null,
    createdAt: iso,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        password: "(same as DEMO_SEED_PASSWORD env or default)",
        workspaceId,
        apiKey,
      },
      null,
      2,
    ),
  );
}

await main();
