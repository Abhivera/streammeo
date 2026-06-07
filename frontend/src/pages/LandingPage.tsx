import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { LegalFooterLinks } from "../components/LegalPageShell";

export function LandingPage(): ReactElement {
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
            Customer service & ticketing
          </p>
          <h1 className="mt-4 font-brand text-4xl font-semibold leading-tight text-vw-headline sm:text-5xl">
            Resolve customer issues faster with one unified support desk
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-vw-muted">
            Streammeo brings email, chat, and API tickets into a single queue — with SLA
            enforcement, collision detection, and analytics built in.
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

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Unified ticket queue",
              body: "Email, web forms, and API channels feed one inbox your agents actually use.",
            },
            {
              title: "SLA enforcement",
              body: "Configurable first-response and resolution targets with automatic breach alerts.",
            },
            {
              title: "Real-time collaboration",
              body: "See who is viewing or typing on a ticket — no more duplicate replies.",
            },
          ].map((item) => (
            <div key={item.title} className="vw-panel p-6">
              <h2 className="text-lg font-semibold text-vw-headline">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-vw-muted">{item.body}</p>
            </div>
          ))}
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
