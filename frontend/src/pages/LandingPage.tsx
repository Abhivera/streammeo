import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LegalFooterLinks } from "../components/LegalPageShell";
import { usePageTitle } from "../hooks/usePageTitle";

const FEATURES = [
  {
    title: "Unified ticket queue",
    body: "Email, live chat, web forms, and API channels feed one inbox — so agents never switch tools mid-shift.",
  },
  {
    title: "SLA enforcement",
    body: "Set first-response and resolution targets per policy. Breaches are flagged automatically on tickets and in your dashboard.",
  },
  {
    title: "Real-time collaboration",
    body: "See who is viewing or typing on a ticket. Cut duplicate replies and keep handoffs clean.",
  },
  {
    title: "AI-assisted replies",
    body: "Claude drafts suggested responses from ticket context. Agents review and send — faster replies without losing control.",
  },
  {
    title: "Live chat widget",
    body: "Embed a lightweight chat widget on your site. Visitors start a session; conversations convert to tickets when needed.",
  },
  {
    title: "Self-service portal",
    body: "Customers track open tickets, reply in-thread, and rate support after resolution — without flooding your inbox.",
  },
];

const PLANS = [
  { name: "Starter", price: "$29/mo", detail: "3 agents · 500 tickets · 1 inbox" },
  { name: "Growth", price: "$79/mo", detail: "10 agents · AI replies · live chat", highlight: true },
  { name: "Business", price: "$199/mo", detail: "50 agents · unlimited tickets · SSO" },
];

export function LandingPage(): ReactElement {
  usePageTitle();

  return (
    <div className="min-h-screen bg-vw-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <BrandLogo variant="full" className="h-16 w-auto" />
        <div className="flex items-center gap-3">
          <Link to="/login" className="vw-btn-secondary text-sm">
            Sign in
          </Link>
          <Link to="/register" className="vw-btn-primary text-sm">
            Start free trial
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-vw-accent">
            B2B customer service & ticketing
          </p>
          <h1 className="mt-4 font-brand text-4xl font-semibold leading-tight text-vw-headline sm:text-5xl">
            One support desk for email, chat, and every customer conversation
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-vw-muted">
            Streammeo helps SaaS teams resolve issues faster with a unified queue, SLA
            tracking, AI-drafted replies, and real-time agent collaboration — built for
            growing support teams in India and beyond.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="vw-btn-primary">
              Create workspace
            </Link>
            <Link to="/login" className="vw-btn-secondary">
              Agent login
            </Link>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-vw-accent">
            Platform
          </h2>
          <p className="mt-3 max-w-2xl text-vw-muted">
            Everything your team needs from first contact to resolution — without stitching
            together five different tools.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item) => (
              <div key={item.title} className="vw-panel p-6">
                <h3 className="text-lg font-semibold text-vw-headline">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-vw-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-vw-accent">
            Pricing
          </h2>
          <p className="mt-3 max-w-2xl text-vw-muted">
            Start on Starter and upgrade as your team scales. All plans include the agent
            console, ticket queue, and SLA policies.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`vw-panel p-6 ${plan.highlight ? "ring-1 ring-vw-accent/40" : ""}`}
              >
                {plan.highlight ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-vw-accent">
                    Most popular
                  </p>
                ) : null}
                <h3 className="mt-1 text-lg font-semibold text-vw-headline">{plan.name}</h3>
                <p className="mt-2 text-3xl font-semibold text-vw-fg">{plan.price}</p>
                <p className="mt-3 text-sm text-vw-muted">{plan.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-vw-muted">
            Payments processed via Razorpay.{" "}
            <Link to="/register" className="text-vw-accent hover:text-vw-accent-hover">
              Create a workspace
            </Link>{" "}
            to see live plan limits in your dashboard.
          </p>
        </section>
      </main>

      <footer className="border-t border-vw-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-vw-muted">© {new Date().getFullYear()} Streammeo</p>
          <LegalFooterLinks />
        </div>
      </footer>
    </div>
  );
}
