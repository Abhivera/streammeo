import type { AppConfig } from "../config";
import { createLogger } from "../logger";

type PublishVoiceEventInput = Readonly<{
  workspaceId: string;
  sessionId: string;
  role: string;
  text: string;
  audioUrl?: string | null;
}>;

type PublishSessionStateInput = Readonly<{
  workspaceId: string;
  sessionId: string;
  state: string;
}>;

async function callGraphql(
  config: AppConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<void> {
  const url = config.APPSYNC_GRAPHQL_URL.trim();
  const key = config.APPSYNC_API_KEY.trim();
  if (!url || !key) return;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`AppSync publish failed (${res.status})`);
  }
}

export async function publishVoiceEvent(
  config: AppConfig,
  input: PublishVoiceEventInput,
): Promise<void> {
  const log = createLogger(config, "appsync-publisher");
  try {
    await callGraphql(
      config,
      `mutation PublishVoiceEvent(
        $workspaceId: ID!,
        $sessionId: ID!,
        $role: String!,
        $text: String!,
        $audioUrl: String
      ) {
        publishVoiceEvent(
          workspaceId: $workspaceId,
          sessionId: $sessionId,
          role: $role,
          text: $text,
          audioUrl: $audioUrl
        ) { sessionId }
      }`,
      input as Record<string, unknown>,
    );
  } catch (err) {
    log.warn({ err, input }, "could not publish voice event");
  }
}

export async function publishSessionState(
  config: AppConfig,
  input: PublishSessionStateInput,
): Promise<void> {
  const log = createLogger(config, "appsync-publisher");
  try {
    await callGraphql(
      config,
      `mutation PublishSessionState(
        $workspaceId: ID!,
        $sessionId: ID!,
        $state: String!
      ) {
        publishSessionState(
          workspaceId: $workspaceId,
          sessionId: $sessionId,
          state: $state
        ) { sessionId }
      }`,
      input as Record<string, unknown>,
    );
  } catch (err) {
    log.warn({ err, input }, "could not publish session state");
  }
}
