import { getAppSyncConfig } from "../config";

export type TicketEvent = {
  workspaceId: string;
  ticketId: string;
  eventType: string;
  payload?: string | Record<string, unknown> | null;
  createdAt: string;
};

type SubscriptionHandlers = {
  onTicketEvent?: (event: TicketEvent) => void;
};

const TICKET_EVENT_SUBSCRIPTION = `subscription OnTicketEvent($workspaceId: ID!) {
  onTicketEvent(workspaceId: $workspaceId) {
    workspaceId
    ticketId
    eventType
    payload
    createdAt
  }
}`;

function encodeAppSyncAuth(host: string, apiKey: string): string[] {
  const header = btoa(JSON.stringify({ host, "x-api-key": apiKey }));
  const payload = btoa(JSON.stringify({}));
  return ["graphql-ws", `header-${header}`, `payload-${payload}`];
}

export function subscribeToTicketEvents(
  workspaceId: string,
  handlers: SubscriptionHandlers,
): (() => void) | null {
  const config = getAppSyncConfig();
  if (!config) return null;

  let cancelled = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: number | undefined;

  const connect = (): void => {
    if (cancelled) return;

    socket = new WebSocket(config.realtimeUrl, encodeAppSyncAuth(config.host, config.apiKey));

    socket.onopen = () => {
      socket?.send(JSON.stringify({ type: "connection_init" }));
    };

    socket.onmessage = (msg) => {
      let data: { type?: string; id?: string; payload?: { data?: { onTicketEvent?: TicketEvent } } };
      try {
        data = JSON.parse(msg.data as string) as typeof data;
      } catch {
        return;
      }

      if (data.type === "connection_ack") {
        socket?.send(
          JSON.stringify({
            type: "start",
            id: "1",
            payload: {
              data: JSON.stringify({
                query: TICKET_EVENT_SUBSCRIPTION,
                variables: { workspaceId },
              }),
              extensions: {
                authorization: {
                  host: config.host,
                  "x-api-key": config.apiKey,
                },
              },
            },
          }),
        );
        return;
      }

      if (data.type === "data") {
        const event = data.payload?.data?.onTicketEvent;
        if (event) handlers.onTicketEvent?.(event);
      }

      if (data.type === "ka") {
        return;
      }

      if (data.type === "error" || data.type === "connection_error") {
        socket?.close();
      }
    };

    socket.onclose = () => {
      socket = null;
      if (!cancelled) {
        reconnectTimer = window.setTimeout(connect, 3000);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  connect();

  return () => {
    cancelled = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
