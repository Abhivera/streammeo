import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Workspace } from "../types";

type PlanKey = keyof typeof NAMES;

const NAMES = {
  starter: "Starter — ₹999 / mo",
  growth: "Growth — ₹1,999 / mo",
  pro: "Pro — ₹2,999 / mo",
} as const;

export function BillingPage(): ReactElement {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [plans, setPlans] =
    useState<Record<string, { price: number; minutesLimit: number; agents: number }> | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [{ data: w }, { data: p }] = await Promise.all([
          api.get<Workspace>("/workspace"),
          api.get("/billing/plans"),
        ]);
        setWs(w);
        setPlans(p as Record<string, { price: number; minutesLimit: number; agents: number }>);
      } catch {
        setStatus("Could not load billing data");
      }
    }
    void load();
  }, []);

  async function checkout(planId: PlanKey): Promise<void> {
    setStatus(null);
    try {
      type OrderResp = Readonly<{ id: string; amount: number; currency: string; key?: string }>;
      const { data } = await api.post<OrderResp>("/billing/create-order", { planId });
      setStatus(
        `Razorpay order ready: ${data.id} (${data.currency} ${data.amount}). Plug into Razorpay Checkout on prod.`,
      );
    } catch (err: unknown) {
      if (axiosErrorStatus(err) === 501)
        setStatus("Razorpay keys missing—set them in backend env.");
      else setStatus("Checkout failed.");
    }
  }

  const usagePct =
    ws && ws.minutesLimit > 0 ? Math.round((ws.minutesUsed / ws.minutesLimit) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="text-sm text-slate-400">
          Hosted checkout wiring is mocked here—`/billing/create-order` already returns Razorpay order
          metadata.
        </p>
      </div>

      {ws ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">Current plan</h2>
          <p className="mt-3 text-xl font-semibold capitalize text-white">{ws.plan}</p>
          <p className="text-sm text-slate-400">
            {ws.minutesUsed} / {ws.minutesLimit} minutes ({usagePct}%)
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-violet-500" style={{ width: `${usagePct}%` }} />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {(Object.keys(NAMES) as PlanKey[]).map((pk) => {
          const tier = plans?.[pk];
          const priceInr =
            tier && typeof tier.price === "number" ? (tier.price / 100).toFixed(2) : "—";

          return (
            <article
              key={pk}
              className={`flex flex-col gap-4 rounded-xl border p-5 ${
                ws?.plan === pk
                  ? "border-violet-500/70 bg-violet-950/20"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold capitalize text-white">{pk}</h3>
                <p className="text-xs text-slate-400">{NAMES[pk]}</p>
                <p className="mt-4 text-sm text-slate-200">
                  {tier ? `${tier.agents} agent seats • ${tier.minutesLimit} min` : ""}
                </p>
                <p className="text-2xl font-bold text-white">₹{priceInr}</p>
              </div>
              <button
                type="button"
                disabled={ws?.plan === pk}
                onClick={() => void checkout(pk)}
                className="mt-auto rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 disabled:opacity-45"
              >
                {ws?.plan === pk ? "Current plan" : "Create upgrade order"}
              </button>
            </article>
          );
        })}
      </section>

      {status ? <div className="rounded-lg bg-slate-900/70 p-3 text-sm text-slate-300">{status}</div> : null}
    </div>
  );
}

function axiosErrorStatus(err: unknown): number | undefined {
  if (!(err && typeof err === "object" && "response" in err)) return undefined;
  const res = err as { response?: { status?: number } };
  return res.response?.status;
}
