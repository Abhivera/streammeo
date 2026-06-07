import type { AppConfig } from "../config.js";

export type TicketEventPayload = Readonly<{
  workspaceId: string;
  ticketId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}>;

export type BillingEventPayload = Readonly<{
  workspaceId: string;
  plan: string;
  eventType: string;
}>;

export type EmailStatusEventPayload = Readonly<{
  workspaceId: string;
  ticketId?: string;
  status: string;
  payload?: Record<string, unknown>;
}>;

async function callGraphql(
  config: AppConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<void> {
  const url = config.APPSYNC_GRAPHQL_URL?.trim();
  const key = config.APPSYNC_API_KEY?.trim();
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
    const text = await res.text().catch(() => "");
    throw new Error(`AppSync publish failed (${res.status}): ${text}`);
  }
}

export async function publishTicketEvent(
  config: AppConfig,
  input: TicketEventPayload,
): Promise<void> {
  try {
    await callGraphql(
      config,
      `mutation PublishTicketEvent(
        $workspaceId: ID!,
        $ticketId: ID!,
        $eventType: String!,
        $payload: AWSJSON
      ) {
        publishTicketEvent(
          workspaceId: $workspaceId,
          ticketId: $ticketId,
          eventType: $eventType,
          payload: $payload
        ) { ticketId eventType }
      }`,
      {
        workspaceId: input.workspaceId,
        ticketId: input.ticketId,
        eventType: input.eventType,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      },
    );
  } catch (err) {
    console.warn("[appsync] publishTicketEvent failed", err);
  }
}

export async function publishBillingEvent(
  config: AppConfig,
  input: BillingEventPayload,
): Promise<void> {
  try {
    await callGraphql(
      config,
      `mutation PublishBillingEvent(
        $workspaceId: ID!,
        $plan: String!,
        $eventType: String!
      ) {
        publishBillingEvent(
          workspaceId: $workspaceId,
          plan: $plan,
          eventType: $eventType
        ) { workspaceId plan }
      }`,
      input as Record<string, unknown>,
    );
  } catch (err) {
    console.warn("[appsync] publishBillingEvent failed", err);
  }
}

export async function publishEmailStatusEvent(
  config: AppConfig,
  input: EmailStatusEventPayload,
): Promise<void> {
  try {
    await callGraphql(
      config,
      `mutation PublishEmailStatus(
        $workspaceId: ID!,
        $ticketId: ID,
        $status: String!,
        $payload: AWSJSON
      ) {
        publishEmailStatus(
          workspaceId: $workspaceId,
          ticketId: $ticketId,
          status: $status,
          payload: $payload
        ) { status }
      }`,
      {
        workspaceId: input.workspaceId,
        ticketId: input.ticketId ?? null,
        status: input.status,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      },
    );
  } catch (err) {
    console.warn("[appsync] publishEmailStatus failed", err);
  }
}
