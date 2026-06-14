import type { Server as HttpServer } from "node:http";
import type { Redis as RedisClient } from "ioredis";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import type { AppConfig } from "../config.js";
import type { JwtPayload } from "../auth/middleware.js";
import { getChatSession } from "@streammeo/db";
import { setChatSocketServer } from "../realtime/chat-socket.js";

type PresenceState = {
  viewers: Map<string, { userId: string; name: string; typing: boolean }>;
};

const ticketPresence = new Map<string, PresenceState>();

export function createPresenceServer(httpServer: HttpServer, config: AppConfig, redis: RedisClient) {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: "/socket.io",
  });

  setChatSocketServer(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    const sessionId = socket.handshake.auth.sessionId as string | undefined;
    const visitorId = socket.handshake.auth.visitorId as string | undefined;

    if (token) {
      try {
        const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
        socket.data.auth = payload;
        next();
      } catch {
        next(new Error("Invalid token"));
      }
      return;
    }

    if (sessionId && visitorId) {
      socket.data.visitor = { sessionId, visitorId };
      next();
      return;
    }

    next(new Error("Unauthorized"));
  });

  io.on("connection", (socket) => {
    const auth = socket.data.auth as JwtPayload | undefined;
    const visitor = socket.data.visitor as { sessionId: string; visitorId: string } | undefined;

    if (auth) {
      socket.on("ticket:join", async ({ ticketId }: { ticketId: string }) => {
        socket.join(`ticket:${ticketId}`);
        const key = `presence:${auth.workspaceId}:${ticketId}`;
        await redis.hset(key, auth.userId, JSON.stringify({ name: auth.email, typing: false }));
        await redis.expire(key, 120);
        const raw = await redis.hgetall(key);
        io.to(`ticket:${ticketId}`).emit("ticket:presence", parsePresence(raw));
      });

      socket.on("ticket:leave", async ({ ticketId }: { ticketId: string }) => {
        socket.leave(`ticket:${ticketId}`);
        const key = `presence:${auth.workspaceId}:${ticketId}`;
        await redis.hdel(key, auth.userId);
        const raw = await redis.hgetall(key);
        io.to(`ticket:${ticketId}`).emit("ticket:presence", parsePresence(raw));
      });

      socket.on("ticket:typing", async ({ ticketId, typing }: { ticketId: string; typing: boolean }) => {
        const key = `presence:${auth.workspaceId}:${ticketId}`;
        await redis.hset(key, auth.userId, JSON.stringify({ name: auth.email, typing }));
        await redis.expire(key, 120);
        socket.to(`ticket:${ticketId}`).emit("ticket:typing", {
          userId: auth.userId,
          email: auth.email,
          typing,
        });
      });

      socket.on("chat:workspace:join", () => {
        socket.join(`workspace:${auth.workspaceId}:chats`);
      });

      socket.on("chat:workspace:leave", () => {
        socket.leave(`workspace:${auth.workspaceId}:chats`);
      });

      socket.on("chat:session:join", async ({ sessionId }: { sessionId: string }) => {
        const session = await getChatSession(sessionId);
        if (!session || session.workspaceId !== auth.workspaceId) return;
        socket.join(`chat:${sessionId}`);
      });

      socket.on("chat:session:leave", ({ sessionId }: { sessionId: string }) => {
        socket.leave(`chat:${sessionId}`);
      });

      socket.on("chat:typing", ({ sessionId, typing }: { sessionId: string; typing: boolean }) => {
        socket.to(`chat:${sessionId}`).emit("chat:typing", {
          sessionId,
          role: "agent" as const,
          typing,
          agentName: auth.email,
        });
      });

      socket.on("disconnect", async () => {
        for (const room of socket.rooms) {
          if (!room.startsWith("ticket:")) continue;
          const ticketId = room.slice("ticket:".length);
          const key = `presence:${auth.workspaceId}:${ticketId}`;
          await redis.hdel(key, auth.userId);
          const raw = await redis.hgetall(key);
          io.to(room).emit("ticket:presence", parsePresence(raw));
        }
      });
      return;
    }

    if (visitor) {
      socket.on("chat:session:join", async () => {
        const session = await getChatSession(visitor.sessionId);
        if (!session || session.visitorId !== visitor.visitorId) return;
        socket.join(`chat:${visitor.sessionId}`);
      });

      socket.on("chat:typing", ({ typing }: { typing: boolean }) => {
        socket.to(`chat:${visitor.sessionId}`).emit("chat:typing", {
          sessionId: visitor.sessionId,
          role: "visitor" as const,
          typing,
        });
      });

      socket.on("disconnect", () => {
        socket.leave(`chat:${visitor.sessionId}`);
      });
    }
  });

  return io;
}

function parsePresence(raw: Record<string, string>) {
  return Object.entries(raw).map(([userId, value]) => {
    const parsed = JSON.parse(value) as { name: string; typing: boolean };
    return { userId, ...parsed };
  });
}

export { ticketPresence };
