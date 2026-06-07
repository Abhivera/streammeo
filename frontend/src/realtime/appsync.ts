type TicketEvent = {
  workspaceId: string;
  ticketId: string;
  eventType: string;
  payload?: string | Record<string, unknown> | null;
  createdAt: string;
};

type SubscriptionHandlers = {
  onTicketEvent?: (event: TicketEvent) => void;
};

function getAppSyncConfig(): { url: string; apiKey: string } | null {
  const url = import.meta.env.VITE_APPSYNC_GRAPHQL_URL?.trim();
  const apiKey = import.meta.env.VITE_APPSYNC_API_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

/** Long-poll style subscription via AppSync HTTP (MVP). Returns cleanup fn. */
export function subscribeToTicketEvents(
  workspaceId: string,
  handlers: SubscriptionHandlers,
): (() => void) | null {
  const config = getAppSyncConfig();
  if (!config) return null;

  let cancelled = false;
  let socket: WebSocket | null = null;

  const connect = async (): Promise<void> => {
    if (cancelled) return;

    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify({
        query: `subscription OnTicketEvent($workspaceId: ID!) {
          onTicketEvent(workspaceId: $workspaceId) {
            workspaceId ticketId eventType payload createdAt
          }
        }`,
        variables: { workspaceId },
      }),
    });

    if (!res.ok || cancelled) return;

    const protocol = config.url.replace(/^http/, "ws");
    const wsUrl = `${protocol}?header=${encodeURIComponent(
      btoa(JSON.stringify({ "x-api-key": config.apiKey })),
    )}&payload=${encodeURIComponent(
      btoa(
        JSON.stringify({
          query: `subscription OnTicketEvent($workspaceId: ID!) {
            onTicketEvent(workspaceId: $workspaceId) {
              workspaceId ticketId eventType payload createdAt
            }
          }`,
          variables: { workspaceId },
        }),
      ),
    )}`;

    socket = new WebSocket(wsUrl, "graphql-ws");

    socket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data as string) as {
          payload?: { data?: { onTicketEvent?: TicketEvent } };
        };
        const event = data.payload?.data?.onTicketEvent;
        if (event) handlers.onTicketEvent?.(event);
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = () => {
      if (!cancelled) {
        window.setTimeout(() => void connect(), 3000);
      }
    };
  };

  void connect();

  return () => {
    cancelled = true;
    socket?.close();
  };
}
