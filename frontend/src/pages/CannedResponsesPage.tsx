import type { ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { PanelState } from "../components/PanelState";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  createCannedResponse,
  deleteCannedResponse,
  fetchCannedResponses,
} from "../api/client";

export function CannedResponsesPage(): ReactElement {
  usePageTitle("Canned responses");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { data: items, loading, reload } = useAsyncData(() => fetchCannedResponses(), []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createCannedResponse(title.trim(), body.trim());
    setTitle("");
    setBody("");
    reload();
  };

  const handleDelete = async (id: string) => {
    await deleteCannedResponse(id);
    reload();
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
        <PanelState
          loading={loading}
          empty={!items?.length}
          emptyMessage="No canned responses yet."
        >
          <ul className="divide-y divide-vw-border-faint">
            {items?.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-vw-headline">{item.title}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-vw-fg-soft">{item.body}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 self-start text-sm text-vw-danger hover:underline sm:self-center"
                  onClick={() => void handleDelete(item.id)}
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
