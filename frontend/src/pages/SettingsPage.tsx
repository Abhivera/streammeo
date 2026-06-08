import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  createBillingOrder,
  fetchBillingPlans,
  fetchBillingUsage,
  fetchMe,
  verifyBillingPayment,
} from "../api/client";
import { openRazorpayCheckout } from "../billing/razorpay";
import { useAuthStore } from "../store/auth";
import type { BillingPlan } from "../types";

export function SettingsPage(): ReactElement {
  usePageTitle("Settings");
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);
  const setWorkspace = useAuthStore((s) => s.setWorkspace);
  const [usage, setUsage] = useState<{
    planName: string;
    plan: string;
    ticketsUsed: number;
    ticketsLimit: number;
    aiRepliesUsed?: number;
    aiRepliesLimit?: number;
  } | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(
    import.meta.env.VITE_RAZORPAY_KEY_ID ?? null,
  );
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const billingNotice = searchParams.get("billing");

  const refreshUsage = () => {
    void fetchBillingUsage().then(setUsage);
    void fetchMe().then((data) => setWorkspace(data.workspace));
  };

  useEffect(() => {
    refreshUsage();
    void fetchBillingPlans().then((data) => {
      setPlans(data.plans);
      if (data.razorpayKeyId) setRazorpayKeyId(data.razorpayKeyId);
    });
  }, [setWorkspace]);

  const pct =
    usage && usage.ticketsLimit > 0 && usage.ticketsLimit < Number.MAX_SAFE_INTEGER
      ? Math.min(100, Math.round((usage.ticketsUsed / usage.ticketsLimit) * 100))
      : 0;

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const order = await createBillingOrder(planId);
      const keyId = order.keyId || razorpayKeyId;
      if (!keyId) {
        alert("Razorpay is not configured. Set RAZORPAY_KEY_ID on the backend.");
        return;
      }

      await openRazorpayCheckout({
        keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        planName: order.planName,
        prefill: order.prefill,
        onDismiss: () => setCheckoutLoading(null),
        onSuccess: async (response) => {
          try {
            await verifyBillingPayment(response);
            setSearchParams({ billing: "success" });
            refreshUsage();
          } catch {
            alert("Payment verification failed. Contact support if you were charged.");
          } finally {
            setCheckoutLoading(null);
          }
        },
      });
    } catch {
      alert("Could not start Razorpay checkout. Check backend Razorpay credentials.");
      setCheckoutLoading(null);
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const widgetSnippet = workspace?.apiKey
    ? `<script src="${window.location.origin}/chat-widget.js" data-api-key="${workspace.apiKey}" data-api-url="${apiBase}"></script>`
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspace & billing"
        description="View your workspace profile, monitor plan usage, upgrade via Razorpay, and copy the live chat embed snippet."
      />

      {billingNotice === "success" ? (
        <p className="rounded-lg border border-vw-success-edge bg-vw-success-soft px-4 py-3 text-sm text-vw-success">
          Plan upgraded successfully.
        </p>
      ) : null}

      <section className="vw-panel space-y-4 p-6">
        <h2 className="text-lg font-medium text-vw-headline">Workspace</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-vw-muted">Name</dt>
            <dd className="mt-1 text-vw-fg">{workspace?.name}</dd>
          </div>
          <div>
            <dt className="text-vw-muted">Slug</dt>
            <dd className="mt-1 font-mono text-vw-fg-soft">{workspace?.slug}</dd>
          </div>
          <div>
            <dt className="text-vw-muted">Signed in as</dt>
            <dd className="mt-1 text-vw-fg">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-vw-muted">Role</dt>
            <dd className="mt-1 capitalize text-vw-fg">{user?.role ?? "agent"}</dd>
          </div>
        </dl>
      </section>

      <section className="vw-panel space-y-4 p-6">
        <h2 className="text-lg font-medium text-vw-headline">Usage & billing</h2>
        <p className="text-xs text-vw-muted">Payments processed securely via Razorpay (INR).</p>
        {usage ? (
          <>
            <p className="text-sm text-vw-muted">
              Plan: <span className="text-vw-fg">{usage.planName}</span>
            </p>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-vw-muted">Tickets this month</span>
                <span className="text-vw-fg">
                  {usage.ticketsUsed} /{" "}
                  {usage.ticketsLimit >= Number.MAX_SAFE_INTEGER ? "∞" : usage.ticketsLimit}
                </span>
              </div>
              {usage.ticketsLimit < Number.MAX_SAFE_INTEGER ? (
                <div className="h-2 overflow-hidden rounded-full bg-vw-progress-track">
                  <div
                    className="h-full rounded-full bg-vw-progress-fill transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              ) : null}
            </div>
            {usage.aiRepliesLimit !== undefined && usage.aiRepliesLimit > 0 ? (
              <p className="text-sm text-vw-muted">
                AI replies: {usage.aiRepliesUsed ?? 0} / {usage.aiRepliesLimit}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-vw-muted">Loading usage…</p>
        )}

        <div className="grid gap-3 pt-2 sm:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-vw-border p-4">
              <p className="font-medium text-vw-headline">{plan.name}</p>
              <p className="mt-1 text-2xl font-semibold text-vw-fg">{plan.priceDisplay}</p>
              <p className="mt-2 text-xs text-vw-muted">
                {plan.agentsLimit} agents · {plan.aiRepliesLimit || 0} AI replies/mo
              </p>
              {usage?.plan !== plan.id ? (
                <button
                  type="button"
                  className="vw-btn-secondary mt-3 w-full text-sm"
                  disabled={checkoutLoading === plan.id}
                  onClick={() => void handleUpgrade(plan.id)}
                >
                  {checkoutLoading === plan.id ? "Opening checkout…" : "Upgrade"}
                </button>
              ) : (
                <p className="mt-3 text-xs text-vw-success">Current plan</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {widgetSnippet ? (
        <section className="vw-panel space-y-3 p-6">
          <h2 className="text-lg font-medium text-vw-headline">Live chat widget</h2>
          <p className="text-sm text-vw-muted">
            Add real-time chat to your website. Paste this snippet before{" "}
            <code className="text-vw-fg-soft">&lt;/body&gt;</code> — visitors can start a
            session that converts to a ticket when they need agent help.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-vw-elevated p-4 text-xs text-vw-fg-soft">
            {widgetSnippet}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
