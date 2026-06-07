import type { Server as HttpServer } from "node:http";
import { Redis } from "ioredis";
import type { Redis as RedisClient } from "ioredis";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import type { AppConfig } from "../config.js";
import type { JwtPayload } from "../auth/middleware.js";

type PresenceState = {
  viewers: Map<string, { userId: string; name: string; typing: boolean }>;
};

const ticketPresence = new Map<string, PresenceState>();

export function createPresenceServer(httpServer: HttpServer, config: AppConfig, redis: RedisClient) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      socket.data.auth = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.data.auth as JwtPayload;

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
