import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { HELP_LAST_UPDATED, HELP_NAV } from "../help/constants";

export function HelpFooterLinks({ className = "" }: { className?: string }): ReactElement {
  return (
    <nav className={className} aria-label="Help center">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-vw-fg-soft">
        <li>
          <Link to="/help" className="transition-colors hover:text-vw-fg">
            Help home
          </Link>
        </li>
        {HELP_NAV.map((item) => (
          <li key={item.slug}>
            <Link to={`/help/${item.slug}`} className="transition-colors hover:text-vw-fg">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function HelpPageShell({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="vw-marketing-shell min-h-screen font-brand text-vw-fg">
      <header className="relative z-10 border-b border-vw-border-softer bg-vw-bg/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/help"
            className="flex shrink-0 items-center outline-none ring-vw-accent ring-offset-2 ring-offset-vw-bg focus-visible:rounded-md focus-visible:ring-2"
          >
            <BrandLogo variant="full" fit="chrome" />
          </Link>
          <Link
            to="/help"
            className="rounded-lg px-3 py-2 text-sm font-medium text-vw-fg-soft transition-colors hover:bg-vw-elevated hover:text-vw-fg"
          >
            Help center
          </Link>
        </div>
      </header>

      <main id="main-content" className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="vw-eyebrow">Customer help</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-vw-headline sm:text-4xl">{title}</h1>
        {summary ? <p className="mt-4 text-base leading-relaxed text-vw-fg-soft">{summary}</p> : null}
        <p className="mt-3 text-sm text-vw-muted">Last updated: {HELP_LAST_UPDATED}</p>
        {children}
      </main>

      <footer className="relative z-10 border-t border-vw-border bg-vw-surface px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <HelpFooterLinks />
          <p className="text-sm text-vw-muted">
            Need account help from a specific company? Contact them directly — this site explains
            how their support tools work, not your product account.
          </p>
          <div className="flex flex-col gap-4 border-t border-vw-border-softer pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/docs"
              className="text-sm font-medium text-vw-accent hover:text-vw-accent-hover"
            >
              Team documentation (for support agents)
            </Link>
            <Link to="/" className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg">
              Streammeo home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
