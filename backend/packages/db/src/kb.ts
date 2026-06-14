import type { ArticleVisibility, KbArticle, KbCategory } from "./types.js";
import { getItem, newId, nowIso, putItem, queryPk, deleteItem, type DbItem } from "./store.js";
import { workspacePk } from "./tickets.js";

type CategoryItem = DbItem & KbCategory & { entityType: "kb_category" };
type ArticleItem = DbItem & KbArticle & { entityType: "kb_article" };

export async function listKbCategories(workspaceId: string): Promise<
  Array<KbCategory & { articleCount: number }>
> {
  const categories = await queryPk<CategoryItem>(workspacePk(workspaceId), "KBCAT#");
  const articles = await queryPk<ArticleItem>(workspacePk(workspaceId), "KB#");
  return categories
    .map((c) => ({
      id: c.id,
      workspaceId: c.workspaceId,
      name: c.name,
      sortOrder: c.sortOrder,
      articleCount: articles.filter((a) => a.categoryId === c.id).length,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function createKbCategory(
  workspaceId: string,
  data: { name: string; sortOrder?: number },
): Promise<KbCategory> {
  const id = newId();
  const category: KbCategory = {
    id,
    workspaceId,
    name: data.name,
    sortOrder: data.sortOrder ?? 0,
  };
  await putItem({
    pk: workspacePk(workspaceId),
    sk: `KBCAT#${id}`,
    entityType: "kb_category",
    ...category,
  });
  return category;
}

export async function listKbArticles(workspaceId: string): Promise<KbArticle[]> {
  const items = await queryPk<ArticleItem>(workspacePk(workspaceId), "KB#");
  return items.map(stripArticle).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getKbArticle(workspaceId: string, id: string): Promise<KbArticle | null> {
  const item = await getItem<ArticleItem>(workspacePk(workspaceId), `KB#${id}`);
  return item ? stripArticle(item) : null;
}

export async function createKbArticle(
  workspaceId: string,
  data: {
    title: string;
    slug: string;
    content: string;
    categoryId?: string | null;
    visibility?: ArticleVisibility;
    publishedAt?: string | null;
  },
): Promise<KbArticle> {
  const id = newId();
  const createdAt = nowIso();
  const article: KbArticle = {
    id,
    workspaceId,
    categoryId: data.categoryId ?? null,
    title: data.title,
    slug: data.slug,
    content: data.content,
    visibility: data.visibility ?? "public",
    helpfulYes: 0,
    helpfulNo: 0,
    publishedAt: data.publishedAt ?? createdAt,
    createdAt,
    updatedAt: createdAt,
  };
  await putItem({
    pk: workspacePk(workspaceId),
    sk: `KB#${id}`,
    entityType: "kb_article",
    gsi1pk: `WS#${workspaceId}#KBSLUG`,
    gsi1sk: data.slug,
    ...article,
  });
  return article;
}

export async function updateKbArticle(
  workspaceId: string,
  id: string,
  patch: Partial<KbArticle>,
): Promise<KbArticle | null> {
  const existing = await getItem<ArticleItem>(workspacePk(workspaceId), `KB#${id}`);
  if (!existing) return null;
  const updated: KbArticle = {
    ...stripArticle(existing),
    ...patch,
    updatedAt: nowIso(),
  };
  await putItem({
    ...existing,
    ...updated,
    gsi1pk: `WS#${workspaceId}#KBSLUG`,
    gsi1sk: updated.slug,
  });
  return updated;
}

export async function deleteKbArticle(workspaceId: string, id: string): Promise<boolean> {
  const existing = await getItem<ArticleItem>(workspacePk(workspaceId), `KB#${id}`);
  if (!existing) return false;
  await deleteItem(workspacePk(workspaceId), `KB#${id}`);
  return true;
}

export async function searchPublicKbArticles(
  workspaceId: string,
  query?: string,
  limit = 20,
): Promise<KbArticle[]> {
  const items = await queryPk<ArticleItem>(workspacePk(workspaceId), "KB#");
  let articles = items
    .map(stripArticle)
    .filter((a) => a.visibility === "public" && a.publishedAt);

  if (query) {
    const q = query.toLowerCase();
    articles = articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q),
    );
  }

  return articles
    .sort((a, b) => b.helpfulYes - a.helpfulYes || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function searchKbForChat(workspaceId: string, query: string, limit = 3) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return [];

  const items = await queryPk<ArticleItem>(workspacePk(workspaceId), "KB#");
  const articles = items
    .map(stripArticle)
    .filter((a) => a.visibility === "public" && a.publishedAt)
    .filter((a) => {
      const text = `${a.title} ${a.content}`.toLowerCase();
      return words.some((w) => text.includes(w));
    })
    .sort((a, b) => b.helpfulYes - a.helpfulYes || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);

  return articles.map((a) => ({
    title: a.title,
    slug: a.slug,
    excerpt: a.content.length > 220 ? `${a.content.slice(0, 220).trim()}…` : a.content.trim(),
  }));
}

function stripArticle(item: ArticleItem): KbArticle {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    categoryId: item.categoryId,
    title: item.title,
    slug: item.slug,
    content: item.content,
    visibility: item.visibility,
    helpfulYes: item.helpfulYes,
    helpfulNo: item.helpfulNo,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getKbCategoryName(
  workspaceId: string,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;
  const cat = await getItem<CategoryItem>(workspacePk(workspaceId), `KBCAT#${categoryId}`);
  return cat?.name ?? null;
}
