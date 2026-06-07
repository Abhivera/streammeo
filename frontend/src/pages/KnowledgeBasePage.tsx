import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { createKbArticle, deleteKbArticle, fetchKbArticles } from "../api/client";
import type { KbArticle } from "../types";

export function KnowledgeBasePage(): ReactElement {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchKbArticles()
      .then(setArticles)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await createKbArticle({ title: title.trim(), content: content.trim(), published: true });
    setTitle("");
    setContent("");
    load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-vw-headline">Knowledge base</h1>
        <p className="mt-1 text-sm text-vw-muted">Help articles for self-service and agent reference</p>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} className="vw-panel space-y-4 p-6">
        <h2 className="text-lg font-medium text-vw-headline">New article</h2>
        <div>
          <label className="vw-field-label" htmlFor="kb-title">
            Title
          </label>
          <input
            id="kb-title"
            className="vw-input mt-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="vw-field-label" htmlFor="kb-content">
            Content
          </label>
          <textarea
            id="kb-content"
            rows={8}
            className="vw-input mt-2 font-mono text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <button type="submit" className="vw-btn-primary">
          Publish article
        </button>
      </form>

      <div className="vw-panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-vw-muted">Loading…</p>
        ) : articles.length === 0 ? (
          <p className="p-6 text-vw-muted">No articles yet.</p>
        ) : (
          <ul className="divide-y divide-vw-border-faint">
            {articles.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-medium text-vw-headline">{a.title}</p>
                  <p className="mt-1 text-xs text-vw-muted">
                    /{a.slug} · {a.visibility}
                    {a.publishedAt ? " · published" : " · draft"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-vw-fg-soft">{a.content}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-vw-danger hover:underline"
                  onClick={() => void deleteKbArticle(a.id).then(load)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
