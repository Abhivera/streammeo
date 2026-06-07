import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import { createAuthHook, requireRole } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { slugify } from "@streammeo/shared";

const categorySchema = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
});

const articleSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  visibility: z.enum(["public", "internal", "gated"]).optional(),
  published: z.boolean().optional(),
});

export async function registerKbRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const auth = createAuthHook(config);
  const adminOnly = [auth, requireRole("admin", "manager")];

  app.get("/api/v1/kb/categories", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const items = await prisma.kbCategory.findMany({
      where: { workspaceId: authPayload.workspaceId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { articles: true } } },
    });
    return {
      items: items.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        articleCount: c._count.articles,
      })),
    };
  });

  app.post("/api/v1/kb/categories", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = categorySchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const category = await prisma.kbCategory.create({
      data: {
        workspaceId: authPayload.workspaceId,
        name: body.data.name,
        sortOrder: body.data.sortOrder ?? 0,
      },
    });
    return reply.code(201).send(category);
  });

  app.get("/api/v1/kb/articles", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const items = await prisma.kbArticle.findMany({
      where: { workspaceId: authPayload.workspaceId },
      orderBy: { updatedAt: "desc" },
      include: { category: { select: { id: true, name: true } } },
    });
    return { items };
  });

  app.post("/api/v1/kb/articles", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = articleSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const slug = body.data.slug ?? slugify(body.data.title);
    const article = await prisma.kbArticle.create({
      data: {
        workspaceId: authPayload.workspaceId,
        title: body.data.title,
        slug,
        content: body.data.content,
        categoryId: body.data.categoryId ?? undefined,
        visibility: body.data.visibility ?? "public",
        publishedAt: body.data.published !== false ? new Date() : null,
      },
    });
    return reply.code(201).send(article);
  });

  app.patch("/api/v1/kb/articles/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = articleSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const existing = await prisma.kbArticle.findFirst({
      where: { id, workspaceId: authPayload.workspaceId },
    });
    if (!existing) return reply.code(404).send({ error: "Article not found" });

    const article = await prisma.kbArticle.update({
      where: { id },
      data: {
        ...(body.data.title ? { title: body.data.title } : {}),
        ...(body.data.slug ? { slug: body.data.slug } : {}),
        ...(body.data.content ? { content: body.data.content } : {}),
        ...(body.data.categoryId !== undefined ? { categoryId: body.data.categoryId } : {}),
        ...(body.data.visibility ? { visibility: body.data.visibility } : {}),
        ...(body.data.published === true ? { publishedAt: new Date() } : {}),
        ...(body.data.published === false ? { publishedAt: null } : {}),
      },
    });
    return article;
  });

  app.delete("/api/v1/kb/articles/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const existing = await prisma.kbArticle.findFirst({
      where: { id, workspaceId: authPayload.workspaceId },
    });
    if (!existing) return reply.code(404).send({ error: "Article not found" });

    await prisma.kbArticle.delete({ where: { id } });
    return { ok: true };
  });

  // Public portal KB search (by workspace slug)
  app.get("/api/v1/portal/:slug/kb", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const q = (request.query as { q?: string }).q?.toLowerCase();

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const articles = await prisma.kbArticle.findMany({
      where: {
        workspaceId: workspace.id,
        visibility: "public",
        publishedAt: { not: null },
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        helpfulYes: true,
        helpfulNo: true,
        category: { select: { name: true } },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    });

    return { workspace: { name: workspace.name, slug: workspace.slug }, articles };
  });

  app.post("/api/v1/portal/:slug/kb/:articleId/feedback", async (request, reply) => {
    const { slug, articleId } = request.params as { slug: string; articleId: string };
    const body = z.object({ helpful: z.boolean() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const article = await prisma.kbArticle.findFirst({
      where: { id: articleId, workspaceId: workspace.id, visibility: "public" },
    });
    if (!article) return reply.code(404).send({ error: "Article not found" });

    await prisma.kbArticle.update({
      where: { id: articleId },
      data: body.data.helpful ? { helpfulYes: { increment: 1 } } : { helpfulNo: { increment: 1 } },
    });
    return { ok: true };
  });
}
