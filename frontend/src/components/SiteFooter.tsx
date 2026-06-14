import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { LegalFooterLinks } from "./LegalPageShell";

type SiteFooterProps = {
  showHomeLink?: boolean;
};

export function SiteFooter({ showHomeLink = false }: SiteFooterProps): ReactElement {
  return (
    <footer className="relative z-10 border-t border-vw-border bg-vw-surface/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.85fr_1.5fr] lg:gap-14">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="w-fit transition-opacity duration-vw hover:opacity-90">
              <BrandLogo variant="full" fit="chrome" chromeSize="footer" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-vw-muted">
              AI-powered customer service and ticketing for SaaS teams.
            </p>
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
                    to="/docs"
                    className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg"
                  >
                    Team documentation
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-vw-muted">
              Legal
            </p>
            <LegalFooterLinks className="[&_ul]:grid [&_ul]:grid-cols-2 [&_ul]:gap-x-8 [&_ul]:gap-y-2.5 sm:[&_ul]:grid-cols-2" />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-vw-border-softer pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-vw-muted">© {new Date().getFullYear()} Streammeo</p>
          {showHomeLink ? (
            <Link
              to="/"
              className="text-sm font-medium text-vw-fg-soft transition-colors hover:text-vw-fg"
            >
              Back to home
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
