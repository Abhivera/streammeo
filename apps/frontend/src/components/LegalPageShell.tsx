import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { LEGAL_LAST_UPDATED, LEGAL_NAV } from "../legal/constants";

export function LegalFooterLinks({ className = "" }: { className?: string }): ReactElement {
  return (
    <nav className={className} aria-label="Legal">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-vw-fg-soft">
        {LEGAL_NAV.map((item) => (
          <li key={item.slug}>
            <Link to={`/legal/${item.slug}`} className="transition-colors hover:text-vw-fg">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LegalPageShell({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="min-h-screen bg-vw-bg font-brand text-vw-fg">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(255, 30, 45, 0.12) 0%, transparent 52%), radial-gradient(90% 70% at 100% 30%, rgba(255, 30, 45, 0.06) 0%, transparent 48%)",
        }}
      />

      <header className="relative z-10 border-b border-vw-border-softer bg-vw-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex shrink-0 items-center outline-none ring-vw-accent ring-offset-2 ring-offset-vw-bg focus-visible:rounded-md focus-visible:ring-2"
          >
            <BrandLogo variant="full" fit="chrome" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-vw-fg-soft transition-colors hover:bg-vw-elevated hover:text-vw-fg"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-vw-accent px-4 py-2 text-sm font-semibold text-vw-accent-fg shadow-vw transition-[background-color,transform] hover:bg-vw-accent-hover active:scale-[0.99]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vw-accent">Legal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-vw-headline sm:text-4xl">{title}</h1>
        {summary ? <p className="mt-4 text-base leading-relaxed text-vw-fg-soft">{summary}</p> : null}
        <p className="mt-3 text-sm text-vw-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
        {children}
      </main>

      <footer className="relative z-10 border-t border-vw-border bg-vw-surface px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <LegalFooterLinks />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <BrandLogo variant="full" fit="chrome" chromeSize="footer" className="opacity-90" />
            <Link to="/" className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg">
              Back to home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
