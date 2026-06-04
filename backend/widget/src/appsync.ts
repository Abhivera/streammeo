type VoiceEvent = Readonly<{
  role: string;
  text: string;
  sessionId: string;
  workspaceId: string;
  audioUrl?: string | null;
}>;

type SessionStateEvent = Readonly<{
  state: string;
  sessionId: string;
  workspaceId: string;
}>;

type RealtimeCallbacks = Readonly<{
  onVoiceEvent: (event: VoiceEvent) => void;
  onSessionState: (event: SessionStateEvent) => void;
  onError: (message: string) => void;
}>;

function toRealtimeUrl(graphqlUrl: string, apiKey: string): string {
  const u = new URL(graphqlUrl);
  const host = u.host;
  const rtHost = host.replace("appsync-api", "appsync-realtime-api");
  const header = btoa(JSON.stringify({ host, "x-api-key": apiKey }));
  return `wss://${rtHost}/graphql?header=${encodeURIComponent(header)}&payload=e30=`;
}

export class AppSyncRealtimeClient {
  private ws: WebSocket | null = null;
  private idSeq = 0;
  private readonly subscriptions = new Set<string>();
  private readonly graphqlHost: string;

  constructor(
    private readonly graphqlUrl: string,
    private readonly apiKey: string,
    private readonly callbacks: RealtimeCallbacks,
  ) {
    this.graphqlHost = new URL(graphqlUrl).host;
  }

  connect(workspaceId: string, sessionId: string): void {
    if (!this.graphqlUrl || !this.apiKey) return;
    const wsUrl = toRealtimeUrl(this.graphqlUrl, this.apiKey);
    this.ws = new WebSocket(wsUrl, "graphql-ws");
    this.ws.addEventListener("open", () => {
      this.send({ type: "connection_init" });
    });
    this.ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          type: string;
          id?: string;
          payload?: { data?: { onVoiceEvent?: VoiceEvent; onSessionState?: SessionStateEvent } };
        };
        if (msg.type === "connection_ack") {
          this.startSubscriptions(workspaceId, sessionId);
          return;
        }
        if (msg.type === "data" && msg.payload?.data?.onVoiceEvent) {
          this.callbacks.onVoiceEvent(msg.payload.data.onVoiceEvent);
          return;
        }
        if (msg.type === "data" && msg.payload?.data?.onSessionState) {
          this.callbacks.onSessionState(msg.payload.data.onSessionState);
        }
      } catch {
        this.callbacks.onError("Realtime payload parse failed");
      }
    });
    this.ws.addEventListener("error", () => {
      this.callbacks.onError("AppSync realtime connection error");
    });
  }

  close(): void {
    if (!this.ws) return;
    for (const id of this.subscriptions) {
      this.send({ id, type: "stop" });
    }
    this.subscriptions.clear();
    this.ws.close();
    this.ws = null;
  }

  private startSubscriptions(workspaceId: string, sessionId: string): void {
    const voiceSubId = this.nextId();
    const stateSubId = this.nextId();
    this.subscriptions.add(voiceSubId);
    this.subscriptions.add(stateSubId);
    this.send({
      id: voiceSubId,
      type: "start",
      payload: {
        data: JSON.stringify({
          query:
            "subscription OnVoiceEvent($workspaceId: ID!, $sessionId: ID!) { onVoiceEvent(workspaceId: $workspaceId, sessionId: $sessionId) { workspaceId sessionId role text audioUrl } }",
          variables: { workspaceId, sessionId },
        }),
        extensions: {
          authorization: {
            host: this.graphqlHost,
            "x-api-key": this.apiKey,
          },
        },
      },
    });
    this.send({
      id: stateSubId,
      type: "start",
      payload: {
        data: JSON.stringify({
          query:
            "subscription OnSessionState($workspaceId: ID!, $sessionId: ID!) { onSessionState(workspaceId: $workspaceId, sessionId: $sessionId) { workspaceId sessionId state } }",
          variables: { workspaceId, sessionId },
        }),
        extensions: {
          authorization: {
            host: this.graphqlHost,
            "x-api-key": this.apiKey,
          },
        },
      },
    });
  }

  private send(payload: unknown): void {
    this.ws?.send(JSON.stringify(payload));
  }

  private nextId(): string {
    this.idSeq += 1;
    return String(this.idSeq);
  }
}
