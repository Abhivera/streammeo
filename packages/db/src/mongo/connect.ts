import { MongoClient, type Db } from "mongodb";

/** DB name from URI path segment, or `streammeo` when none (e.g. `mongodb://host:27017`). */
export function defaultDbName(mongoUri: string): string {
  const noQuery = mongoUri.split("?")[0] ?? mongoUri;
  const slash = noQuery.lastIndexOf("/");
  if (slash >= 0 && slash < noQuery.length - 1) {
    const segment = noQuery.slice(slash + 1);
    if (segment && !segment.includes("@")) {
      return segment;
    }
  }
  return "streammeo";
}

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("workspaces").createIndex({ apiKey: 1 }, { unique: true });
  await db.collection("workspaces").createIndex({ ownerId: 1 });
  await db
    .collection("sessions")
    .createIndex({ workspaceId: 1, startedAt: -1, _id: -1 });
  await db.collection("messages").createIndex({ sessionId: 1, createdAt: 1, id: 1 });
  await db.collection("messages").createIndex({ workspaceId: 1, createdAt: -1 });
  await db.collection("toolCalls").createIndex({ sessionId: 1, createdAt: 1, id: 1 });
  await db.collection("faqs").createIndex({ workspaceId: 1, createdAt: -1, id: -1 });
}

export async function connectMongo(
  mongoUri: string,
  dbName?: string | undefined,
): Promise<{ client: MongoClient; db: Db }> {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const name = dbName ?? defaultDbName(mongoUri);
  const db = client.db(name);
  await ensureIndexes(db);
  return { client, db };
}
