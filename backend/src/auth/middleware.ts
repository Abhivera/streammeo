import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AppConfig } from "../config";
import { getStore } from "../db";

export interface JwtPayload {
  userId: string;
  workspaceId: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Express merges `interface Request`
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export function createAuthMiddleware(config: AppConfig) {
  return async function verifyJwtMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      const ws = await getStore().workspaces.findById(decoded.workspaceId);
      if (!ws || ws.ownerId !== decoded.userId) {
        res.status(401).json({ error: "Invalid workspace context" });
        return;
      }
      req.auth = decoded;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };
}
