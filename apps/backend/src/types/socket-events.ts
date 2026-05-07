import type { Server, Socket } from "socket.io";

export interface ServerToClientEvents {
  transcript: (text: string) => void;
  "generation-start": (id: number) => void;
  "audio-chunk": (data: { audio: string; generationId: number }) => void;
  "stop-playback": () => void;
  "llm-token": (token: string) => void;
}

export interface ClientToServerEvents {
  audioChunk: (data: Int16Array) => void;
}

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
