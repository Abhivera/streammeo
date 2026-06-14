import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { DOCS_LAST_UPDATED, DOCS_NAV } from "../doc-guides/constants";

export function DocsFooterLinks({ className = "" }: { className?: string }): ReactElement {
  return (
    <nav className={className} aria-label="Documentation">
      <ul className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm font-medium text-vw-fg-soft sm:grid-cols-2">
        <li>
          <Link to="/docs" className="transition-colors hover:text-vw-fg">
            All guides
          </Link>
        </li>
        {DOCS_NAV.map((item) => (
          <li key={item.slug}>
            <Link to={`/docs/${item.slug}`} className="transition-colors hover:text-vw-fg">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DocsPageShell({
  title,
  summary,
  children,
  wide = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  wide?: boolean;
}): ReactElement {
  const mainWidth = wide ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="vw-marketing-shell min-h-screen font-brand text-vw-fg">
      <header className="relative z-10 border-b border-vw-border-softer bg-vw-bg/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex shrink-0 items-center outline-none ring-vw-accent ring-offset-2 ring-offset-vw-bg focus-visible:rounded-md focus-visible:ring-2"
          >
            <BrandLogo variant="full" fit="chrome" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/help"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-vw-fg-soft transition-colors hover:bg-vw-elevated hover:text-vw-fg sm:inline-flex"
            >
              Customer help
            </Link>
            <Link
              to="/docs"
              className="hidden rounded-lg bg-vw-elevated px-3 py-2 text-sm font-medium text-vw-fg transition-colors hover:bg-vw-elevated/80 sm:inline-flex"
              aria-current="page"
            >
              Team docs
            </Link>
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-vw-fg-soft transition-colors hover:bg-vw-elevated hover:text-vw-fg"
            >
              Log in
            </Link>
            <Link to="/register" className="vw-btn-primary text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className={`relative z-10 mx-auto ${mainWidth} px-4 py-12 sm:px-6 lg:px-8`}
      >
        <p className="vw-eyebrow">Team documentation</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-vw-headline sm:text-4xl">{title}</h1>
        {summary ? <p className="mt-4 max-w-3xl text-base leading-relaxed text-vw-fg-soft">{summary}</p> : null}
        <p className="mt-3 text-sm text-vw-muted">Last updated: {DOCS_LAST_UPDATED}</p>
        {children}
      </main>

      <footer className="relative z-10 border-t border-vw-border bg-vw-surface/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr] lg:gap-14">
            <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
              <Link to="/" className="w-fit transition-opacity duration-vw hover:opacity-90">
                <BrandLogo variant="full" fit="chrome" chromeSize="footer" />
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-vw-muted">
                Guides for agents and admins using Streammeo.
              </p>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-vw-muted">
                Guides
              </p>
              <DocsFooterLinks />
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-vw-muted">
                Resources
              </p>
              <nav aria-label="Site resources">
                <ul className="flex flex-col gap-3">
                  <li>
                    <Link
                      to="/help"
                      className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg"
                    >
                      Customer help
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/register"
                      className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg"
                    >
                      Create a workspace
                    </Link>
                  </li>
                  <li>
                    <a
                      href="/widget-demo.html"
                      className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg"
                    >
                      Widget demo
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-vw-border-softer pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-vw-muted">© {new Date().getFullYear()} Streammeo</p>
            <Link
              to="/"
              className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg"
            >
              Back to home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
