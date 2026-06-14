import type { ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { PanelState } from "../components/PanelState";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import { createKbArticle, deleteKbArticle, fetchKbArticles } from "../api/client";
import { apiErrorMessage } from "../lib/apiError";

export function KnowledgeBasePage(): ReactElement {
  usePageTitle("Knowledge base");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { data: articles, loading, reload } = useAsyncData(() => fetchKbArticles(), []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      await createKbArticle({ title: title.trim(), content: content.trim(), published: true });
      setTitle("");
      setContent("");
      setFormError(null);
      reload();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not publish article."));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Knowledge base"
        description="Publish help articles for customer self-service and agent reference. Published articles are searchable via the public KB API."
      />

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
        {formError ? <p className="text-sm text-vw-danger">{formError}</p> : null}
      </form>

      <div className="vw-panel overflow-hidden">
        <PanelState loading={loading} empty={!articles?.length} emptyMessage="No articles yet.">
          <ul className="divide-y divide-vw-border-faint">
            {articles?.map((article) => (
              <li key={article.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-vw-headline">{article.title}</p>
                  <p className="mt-1 text-xs text-vw-muted">
                    /{article.slug} · {article.visibility}
                    {article.publishedAt ? " · published" : " · draft"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-vw-fg-soft">{article.content}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 self-start text-sm text-vw-danger hover:underline sm:self-center"
                  onClick={() =>
                    void deleteKbArticle(article.id)
                      .then(reload)
                      .catch(() => alert("Could not delete article."))
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </PanelState>
      </div>
    </div>
  );
}
