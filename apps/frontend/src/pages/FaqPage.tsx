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
    void refresh();
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
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">FAQ corpus</h1>
        <p className="text-sm text-slate-400">
          These entries power the{" "}
          <code className="text-xs text-violet-300">search_faq</code> tool Claude can call mid-call.
        </p>
      </div>

      <form onSubmit={add} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <label className="block text-sm text-slate-200">
          Question
          <textarea
            value={question}
            required
            rows={3}
            onChange={(evt) => setQuestion(evt.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-sm text-slate-200">
          Answer
          <textarea
            value={answer}
            rows={5}
            required
            onChange={(evt) => setAnswer(evt.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Add FAQ entry
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Stored FAQs</h2>
        <ul className="space-y-3">
          {rows.map((f) => (
            <li
              key={f.id}
              className="space-y-1 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-100"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-white">{f.question}</p>
                <button
                  type="button"
                  onClick={() => void remove(f.id)}
                  className="shrink-0 text-xs text-rose-400 hover:text-rose-300"
                >
                  Delete
                </button>
              </div>
              <p className="text-xs text-slate-400">{f.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
