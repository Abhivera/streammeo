import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { FaqRow } from "../types";

export function FaqPage(): ReactElement {
  const [rows, setRows] = useState<FaqRow[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function refresh(): Promise<void> {
    const { data } = await api.get<FaqRow[]>("/workspace/faq");
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await api.get<FaqRow[]>("/workspace/faq");
      if (!cancelled) setRows(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function add(evt: FormEvent): Promise<void> {
    evt.preventDefault();
    await api.post("/workspace/faq", { question, answer });
    setQuestion("");
    setAnswer("");
    await refresh();
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`/workspace/faq/${id}`);
    await refresh();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <h1 className="vw-page-title">FAQ library</h1>
        <p className="vw-page-lede">
          Curated answers for customer support. Entries power the{" "}
          <code className="rounded bg-vw-keywell px-1.5 py-0.5 font-mono text-xs text-vw-fg">search_faq</code> tool
          during live voice calls so replies stay on-policy.
        </p>
      </header>

      <form onSubmit={add} className="vw-panel space-y-5 p-6 sm:p-7">
        <label className="vw-field-label">
          Question
          <textarea
            value={question}
            required
            rows={3}
            onChange={(evt) => setQuestion(evt.target.value)}
            className="vw-input"
          />
        </label>
        <label className="vw-field-label">
          Answer
          <textarea
            value={answer}
            rows={5}
            required
            onChange={(evt) => setAnswer(evt.target.value)}
            className="vw-input"
          />
        </label>
        <button type="submit" className="vw-btn-primary">
          Add FAQ entry
        </button>
      </form>

      <section>
        <h2 className="text-sm font-semibold text-vw-headline">Stored FAQs</h2>
        <ul className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <li className="vw-panel px-4 py-8 text-center text-sm text-vw-muted">No entries yet. Add a pair above.</li>
          ) : (
            rows.map((f) => (
              <li key={f.id} className="vw-panel flex flex-col gap-2 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium leading-snug text-vw-headline">{f.question}</p>
                  <button
                    type="button"
                    onClick={() => void remove(f.id)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-vw-danger transition-colors duration-vw ease-out-expo hover:bg-vw-danger-soft hover:text-vw-danger"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-vw-fg">{f.answer}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
