import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import type { AppConfig } from "../config.js";

export type JwtPayload = {
  userId: string;
  workspaceId: string;
  email: string;
  role: "admin" | "manager" | "agent";
};

declare module "fastify" {
  interface FastifyRequest {
    auth?: JwtPayload;
  }
}

export function signToken(payload: JwtPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function createAuthHook(config: AppConfig) {
  return async function authHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    const token = header.slice("Bearer ".length);
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      request.auth = decoded;
    } catch {
      reply.code(401).send({ error: "Invalid token" });
    }
  };
}

export function requireRole(...roles: JwtPayload["role"][]) {
  return async function roleHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.auth) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(request.auth.role)) {
      reply.code(403).send({ error: "Forbidden" });
    }
  };
}
