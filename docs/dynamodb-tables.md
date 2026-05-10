# DynamoDB tables (VoiceWidget)

Create six tables. Replace `VoiceWidget` with your `DYNAMODB_TABLE_PREFIX` (default `VoiceWidget`). All GSIs use **ProjectionType: ALL** unless you want to trim attributes.

## 1. `{prefix}Users`

| Key | Attribute | Type |
|-----|-----------|------|
| PK | `email` | S |
| — | `id` | S (stable user id for JWT) |
| — | `password` | S |
| — | `createdAt` | S (ISO) |

**GSI `UserIdIndex`**

- Partition key: `id` (S)

## 2. `{prefix}Workspaces`

| Key | Attribute | Type |
|-----|-----------|------|
| PK | `id` | S |
| — | `name`, `apiKey`, `language`, `agentName`, `systemPrompt`, `plan` | S |
| — | `minutesUsed`, `minutesLimit`, `sessionCount` | N |
| — | `ownerId` | S |
| — | `shopifyShopDomain`, `shopifyAccessToken` | S (nullable: omit token when unset) |
| — | `createdAt` | S (ISO) |

**GSI `ApiKeyIndex`**

- Partition key: `apiKey` (S)

**GSI `OwnerIndex`**

- Partition key: `ownerId` (S)

## 3. `{prefix}Sessions`

| Key | Attribute | Type |
|-----|-----------|------|
| PK | `id` | S |
| — | `workspaceId` | S |
| — | `startedAt` | N (epoch ms) |
| — | `endedAt` | S (ISO) / null |
| — | `durationSec`, `messageCount` | N |
| — | `resolved` | BOOL |

**GSI `WorkspaceTimeIndex`**

- Partition key: `workspaceId` (S)
- Sort key: `startedAt` (N)

## 4. `{prefix}Messages`

| Key | Attribute | Type |
|-----|-----------|------|
| PK | `sessionId` | S |
| SK | `id` | S |
| — | `workspaceId`, `role`, `text` | S |
| — | `audioUrl` | S (optional) |
| — | `createdAt` | N (epoch ms) |

**GSI `WorkspaceTimeIndex`**

- Partition key: `workspaceId` (S)
- Sort key: `createdAt` (N)

## 5. `{prefix}ToolCalls`

| Key | Attribute | Type |
|-----|-----------|------|
| PK | `sessionId` | S |
| SK | `id` | S |
| — | `toolName` | S |
| — | `input`, `output` | M (maps) |
| — | `createdAt` | N (epoch ms) |

## 6. `{prefix}Faqs`

| Key | Attribute | Type |
|-----|-----------|------|
| PK | `workspaceId` | S |
| SK | `id` | S |
| — | `question`, `answer` | S |
| — | `embedding` | L of N (often empty until RAG embeddings exist) |
| — | `createdAt` | N (epoch ms) |

---

**Local dev:** run [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html), set `DYNAMODB_ENDPOINT=http://localhost:8000`, and use dummy `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (e.g. `local` / `local`).

**Seed demo user/workspace:** after tables exist, `pnpm db:seed` (see script env vars in `packages/db/scripts/seed.ts`).
