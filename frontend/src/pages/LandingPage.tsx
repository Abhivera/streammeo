import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/MarketingShell";
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
    <MarketingShell
      showHero
      heroEyebrow="AI customer service & ticketing"
      heroTitle="One support desk for email, chat, and every customer conversation"
      heroDescription="Streammeo helps SaaS teams resolve issues faster with a unified queue, SLA tracking, AI-drafted replies, and real-time agent collaboration — built for growing support teams."
      heroPrimaryCta={{ label: "Start free trial", to: "/register" }}
      heroSecondaryCta={{ label: "I already have an account", to: "/login" }}
    >
      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <section className="mt-4 border-t border-vw-border pt-20">
          <p className="vw-eyebrow">Platform</p>
          <h2 className="mt-4 max-w-2xl font-brand text-3xl font-semibold tracking-tight text-vw-headline sm:text-4xl">
            Everything from first contact to resolution
          </h2>
          <p className="mt-4 max-w-2xl text-vw-muted">
            One platform for your whole support workflow — without stitching together five different
            tools.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item, index) => (
              <div
                key={item.title}
                className="vw-panel group p-6 transition-[border-color,transform] duration-vw ease-out-expo hover:-translate-y-0.5 hover:border-vw-accent/30"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="mb-4 h-1 w-8 rounded-full bg-vw-accent/80 transition-all duration-vw group-hover:w-12" />
                <h3 className="text-lg font-semibold text-vw-headline">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-vw-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 border-t border-vw-border pt-20">
          <p className="vw-eyebrow">Pricing</p>
          <h2 className="mt-4 max-w-xl font-brand text-3xl font-semibold tracking-tight text-vw-headline sm:text-4xl">
            Plans that scale with your team
          </h2>
          <p className="mt-4 max-w-2xl text-vw-muted">
            Start on Starter and upgrade as you grow. All plans include the agent console, ticket
            queue, and SLA policies.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`vw-panel flex flex-col p-6 ${
                  plan.highlight
                    ? "relative border-vw-accent/40 bg-gradient-to-b from-vw-accent-surface to-vw-surface ring-1 ring-vw-accent/30"
                    : ""
                }`}
              >
                {plan.highlight ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-vw-accent">
                    Most popular
                  </p>
                ) : (
                  <span className="h-5" aria-hidden />
                )}
                <h3 className="mt-1 text-lg font-semibold text-vw-headline">{plan.name}</h3>
                <p className="mt-3 font-brand text-4xl font-semibold tracking-tight text-vw-fg">
                  {plan.price}
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-vw-muted">{plan.detail}</p>
                <Link
                  to="/register"
                  className={`mt-6 w-full text-center ${
                    plan.highlight ? "vw-btn-primary" : "vw-btn-secondary"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-vw-muted">
            Payments processed via Razorpay.{" "}
            <Link
              to="/register"
              className="font-medium text-vw-accent underline decoration-vw-accent/50 underline-offset-4 hover:text-vw-accent-hover"
            >
              Create a workspace
            </Link>{" "}
            to see live plan limits in your dashboard.
          </p>
        </section>
      </main>
    </MarketingShell>
  );
}
