import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  createCannedResponse,
  deleteCannedResponse,
  fetchCannedResponses,
} from "../api/client";
import type { CannedResponse } from "../types";

export function CannedResponsesPage(): ReactElement {
  usePageTitle("Canned responses");
  const [items, setItems] = useState<CannedResponse[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchCannedResponses()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createCannedResponse(title.trim(), body.trim());
    setTitle("");
    setBody("");
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteCannedResponse(id);
    load();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Canned responses"
        description="Save reply templates your team can insert from the ticket composer. Use {{customer_name}} and {{agent_name}} as placeholders."
      />

      <form onSubmit={(e) => void handleCreate(e)} className="vw-panel space-y-4 p-6">
        <h2 className="text-lg font-medium text-vw-headline">Add template</h2>
        <div>
          <label className="vw-field-label" htmlFor="cr-title">
            Title
          </label>
          <input
            id="cr-title"
            className="vw-input mt-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Acknowledge receipt"
          />
        </div>
        <div>
          <label className="vw-field-label" htmlFor="cr-body">
            Body
          </label>
          <textarea
            id="cr-body"
            rows={4}
            className="vw-input mt-2"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {{customer_name}}, thanks for reaching out…"
          />
        </div>
        <button type="submit" className="vw-btn-primary">
          Save template
        </button>
      </form>

      <div className="vw-panel overflow-hidden">
        {loading ? (
          <p className="p-6 text-vw-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-vw-muted">No canned responses yet.</p>
        ) : (
          <ul className="divide-y divide-vw-border-faint">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-medium text-vw-headline">{item.title}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-vw-fg-soft">{item.body}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-vw-danger hover:underline"
                  onClick={() => void handleDelete(item.id)}
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
