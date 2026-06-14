import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createKbArticle,
  createKbCategory,
  deleteKbArticle,
  getKbArticle,
  getKbCategoryName,
  getWorkspaceBySlug,
  listKbArticles,
  listKbCategories,
  searchPublicKbArticles,
  updateKbArticle,
} from "@streammeo/db";
import type { AppConfig } from "../config.js";
import { createAuthHook, requireRole } from "../auth/middleware.js";
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

    const items = await listKbCategories(authPayload.workspaceId);
    return { items };
  });

  app.post("/api/v1/kb/categories", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = categorySchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const category = await createKbCategory(authPayload.workspaceId, body.data);
    return reply.code(201).send(category);
  });

  app.get("/api/v1/kb/articles", { preHandler: auth }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const items = await listKbArticles(authPayload.workspaceId);
    const enriched = await Promise.all(
      items.map(async (a) => ({
        ...a,
        category: a.categoryId
          ? { id: a.categoryId, name: await getKbCategoryName(authPayload.workspaceId, a.categoryId) }
          : null,
      })),
    );
    return { items: enriched };
  });

  app.post("/api/v1/kb/articles", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const body = articleSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const slug = body.data.slug ?? slugify(body.data.title);
    const article = await createKbArticle(authPayload.workspaceId, {
      title: body.data.title,
      slug,
      content: body.data.content,
      categoryId: body.data.categoryId ?? null,
      visibility: body.data.visibility,
      publishedAt: body.data.published !== false ? new Date().toISOString() : null,
    });
    return reply.code(201).send(article);
  });

  app.patch("/api/v1/kb/articles/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const body = articleSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const existing = await getKbArticle(authPayload.workspaceId, id);
    if (!existing) return reply.code(404).send({ error: "Article not found" });

    const article = await updateKbArticle(authPayload.workspaceId, id, {
      ...(body.data.title ? { title: body.data.title } : {}),
      ...(body.data.slug ? { slug: body.data.slug } : {}),
      ...(body.data.content ? { content: body.data.content } : {}),
      ...(body.data.categoryId !== undefined ? { categoryId: body.data.categoryId } : {}),
      ...(body.data.visibility ? { visibility: body.data.visibility } : {}),
      ...(body.data.published === true ? { publishedAt: new Date().toISOString() } : {}),
      ...(body.data.published === false ? { publishedAt: null } : {}),
    });
    return article;
  });

  app.delete("/api/v1/kb/articles/:id", { preHandler: adminOnly }, async (request, reply) => {
    const authPayload = request.auth;
    if (!authPayload) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const deleted = await deleteKbArticle(authPayload.workspaceId, id);
    if (!deleted) return reply.code(404).send({ error: "Article not found" });
    return { ok: true };
  });

  app.get("/api/v1/portal/:slug/kb", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const q = (request.query as { q?: string }).q?.toLowerCase();

    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const articles = await searchPublicKbArticles(workspace.id, q);
    const enriched = await Promise.all(
      articles.map(async (a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        content: a.content,
        helpfulYes: a.helpfulYes,
        helpfulNo: a.helpfulNo,
        category: { name: await getKbCategoryName(workspace.id, a.categoryId) },
      })),
    );

    return { workspace: { name: workspace.name, slug: workspace.slug }, articles: enriched };
  });

  app.post("/api/v1/portal/:slug/kb/:articleId/feedback", async (request, reply) => {
    const { slug, articleId } = request.params as { slug: string; articleId: string };
    const body = z.object({ helpful: z.boolean() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });

    const workspace = await getWorkspaceBySlug(slug);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    const article = await getKbArticle(workspace.id, articleId);
    if (!article || article.visibility !== "public") {
      return reply.code(404).send({ error: "Article not found" });
    }

    await updateKbArticle(workspace.id, articleId, {
      helpfulYes: body.data.helpful ? article.helpfulYes + 1 : article.helpfulYes,
      helpfulNo: body.data.helpful ? article.helpfulNo : article.helpfulNo + 1,
    });
    return { ok: true };
  });
}
