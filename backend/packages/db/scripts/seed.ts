/**
 * Clears DynamoDB app tables and inserts fixed test accounts + sample workspace data.
 * Env: `AWS_REGION`, table names, optional `DYNAMODB_ENDPOINT` for local Dynamo.
 * Optional: `SEED_TEST_PASSWORD` overrides the bcrypt source for seeded users.
 */

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createStreammeoStore, type StreammeoStore } from "../src/store";

const TEST_ACCOUNTS = [
  { email: "moviesabhijit@gmail.com", workspaceName: "Movies Abhijit (test)" },
  { email: "abhijitakadeveloper@gmail.com", workspaceName: "Abhijit AKA Developer (test)" },
] as const;

const password = process.env.SEED_TEST_PASSWORD ?? "abhivera@A1";

async function main(): Promise<void> {
  const store = await createStreammeoStore({
    region: process.env.AWS_REGION ?? "ap-south-1",
    ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
    usersTable: process.env.DYNAMODB_USERS_TABLE ?? "streammeo-users",
    workspacesTable: process.env.DYNAMODB_WORKSPACES_TABLE ?? "streammeo-workspaces",
    sessionsTable: process.env.DYNAMODB_SESSIONS_TABLE ?? "streammeo-sessions",
    messagesTable: process.env.DYNAMODB_MESSAGES_TABLE ?? "streammeo-messages",
    toolCallsTable: process.env.DYNAMODB_TOOL_CALLS_TABLE ?? "streammeo-tool-calls",
    faqsTable: process.env.DYNAMODB_FAQS_TABLE ?? "streammeo-faqs",
  });

  await store.clearAllData();
  console.log("Cleared all DynamoDB rows in configured Streammeo tables");

  const passwordHash = await bcrypt.hash(password, 12);
  const iso = new Date().toISOString();
  const created: Array<{ email: string; workspaceId: string; apiKey: string }> = [];

  for (const acct of TEST_ACCOUNTS) {
    const email = acct.email.toLowerCase().trim();
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const apiKey =
      `${randomUUID().replace(/-/gu, "")}${randomUUID().replace(/-/gu, "").slice(0, 10)}`;

    await store.users.createIfAbsent({
      id: userId,
      email,
      password: passwordHash,
      createdAt: iso,
    });

    await store.workspaces.put({
      id: workspaceId,
      name: acct.workspaceName,
      apiKey,
      language: "en",
      agentName: "Alex",
      systemPrompt: "You are a helpful customer support agent.",
      plan: "free",
      minutesUsed: 0,
      minutesLimit: 0,
      ownerId: userId,
      shopifyShopDomain: null,
      shopifyAccessToken: null,
      createdAt: iso,
    });

    await seedSampleWorkspaceContent(store, workspaceId);
    created.push({ email, workspaceId, apiKey });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        region: process.env.AWS_REGION ?? "ap-south-1",
        passwordSource: process.env.SEED_TEST_PASSWORD ? "SEED_TEST_PASSWORD env" : "default test password",
        accounts: created.map((c) => ({
          email: c.email,
          workspaceId: c.workspaceId,
          apiKey: c.apiKey,
        })),
        hint: "Sign in at /login with a seeded email and the same password used for bcrypt (default local password, or SEED_TEST_PASSWORD if you set it).",
      },
      null,
      2,
    ),
  );
  await store.close();
}

async function seedSampleWorkspaceContent(store: StreammeoStore, workspaceId: string): Promise<void> {
  const t = Date.now() - 86_400_000;
  await store.faqs.put({
    workspaceId,
    id: randomUUID(),
    question: "What are your store hours?",
    answer: "We are open Monday to Saturday, 10am to 8pm local time.",
    embedding: [],
    createdAtMs: t,
  });
  await store.faqs.put({
    workspaceId,
    id: randomUUID(),
    question: "How do I return an item?",
    answer: "Returns are accepted within 7 days with the original invoice.",
    embedding: [],
    createdAtMs: t + 1000,
  });

  const sessionA = randomUUID();
  await store.sessions.createForWorkspace(workspaceId, sessionA);
  const u1 = randomUUID();
  const a1 = randomUUID();
  await store.messages.put({
    id: u1,
    sessionId: sessionA,
    workspaceId,
    role: "user",
    text: "Where is order VW-1001?",
    audioUrl: null,
    createdAtMs: t + 10_000,
  });
  await store.messages.put({
    id: a1,
    sessionId: sessionA,
    workspaceId,
    role: "assistant",
    text: "Order VW-1001 shipped with DHL. Tracking JD0146000058290401.",
    audioUrl: null,
    createdAtMs: t + 11_000,
  });
  await store.sessions.addMessageCount(sessionA, 2);
  await store.toolCalls.put({
    id: randomUUID(),
    sessionId: sessionA,
    toolName: "get_order_status",
    input: { order_id: "VW-1001" },
    output: { result: "mock tracking payload" },
    createdAtMs: t + 10_500,
  });
  await store.sessions.patch(sessionA, {
    endedAt: new Date(t + 12_000).toISOString(),
    durationSec: 45,
    resolved: true,
  });

  const sessionB = randomUUID();
  await store.sessions.createForWorkspace(workspaceId, sessionB);
  const u2 = randomUUID();
  await store.messages.put({
    id: u2,
    sessionId: sessionB,
    workspaceId,
    role: "user",
    text: "Do you ship internationally?",
    audioUrl: null,
    createdAtMs: t + 50_000,
  });
  await store.sessions.addMessageCount(sessionB, 1);
  await store.sessions.patch(sessionB, {
    endedAt: new Date(t + 51_000).toISOString(),
    durationSec: 12,
    resolved: false,
  });
}

await main();
