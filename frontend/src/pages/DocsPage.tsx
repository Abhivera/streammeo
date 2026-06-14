import type { ReactElement } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { DocsPageShell } from "../components/DocsPageShell";
import { GuideIndexList } from "../components/GuideIndexList";
import { GuideSection } from "../components/GuideSection";
import { RelatedGuideLinks } from "../components/RelatedGuideLinks";
import {
  ChatIcon,
  ChevronRightIcon,
  DashboardIcon,
  HelpIcon,
  PortalIcon,
  SettingsIcon,
  TicketsIcon,
} from "../components/NavIcons";
import { DOCS_NAV, type DocSlug } from "../doc-guides/constants";
import { getDocGuide } from "../doc-guides/guides";
import { usePageTitle } from "../hooks/usePageTitle";

const DOC_ICONS: Record<DocSlug, ReactElement> = {
  "getting-started": <DashboardIcon className="h-5 w-5" />,
  "agent-console": <TicketsIcon className="h-5 w-5" />,
  settings: <SettingsIcon className="h-5 w-5" />,
  "live-chat-widget": <ChatIcon className="h-5 w-5" />,
  "customer-experience": <PortalIcon className="h-5 w-5" />,
};

const QUICK_LINKS = [
  {
    title: "Create a workspace",
    description: "Start a free trial and set up your support desk.",
    href: "/register",
    internal: true,
  },
  {
    title: "Customer help center",
    description: "Share this with end customers — not your agents.",
    href: "/help",
    internal: true,
  },
  {
    title: "Widget demo page",
    description: "Test the live chat embed on a sample page.",
    href: "/widget-demo.html",
    internal: false,
  },
] as const;

export function DocsDocumentPage(): ReactElement {
  const { slug = "" } = useParams<{ slug: string }>();
  const guide = getDocGuide(slug);

  usePageTitle(guide?.title ?? "Team documentation");

  if (!guide) {
    return <Navigate to="/docs" replace />;
  }

  return (
    <DocsPageShell title={guide.title} summary={guide.summary}>
      <article className="mt-10 space-y-10">
        {guide.sections.map((section) => (
          <GuideSection key={section.title} idPrefix="doc" section={section} />
        ))}
      </article>

      <RelatedGuideLinks
        title="More team guides"
        basePath="/docs"
        currentSlug={slug}
        items={DOCS_NAV}
      />
    </DocsPageShell>
  );
}

export function DocsIndexPage(): ReactElement {
  usePageTitle("Team documentation");

  return (
    <DocsPageShell
      wide
      title="Team documentation"
      summary="Guides for support agents and admins — workspace setup, the agent console, and chat widget embed."
    >
      <div className="mt-10 flex gap-4 rounded-xl border border-vw-accent/30 bg-vw-accent-surface p-5 sm:items-start sm:p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vw-accent/15 text-vw-accent">
          <HelpIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-vw-headline">Looking for customer help?</p>
          <p className="mt-2 text-sm leading-relaxed text-vw-fg-soft">
            End customers (people contacting your company for support) should use the{" "}
            <Link to="/help" className="font-medium text-vw-accent hover:text-vw-accent-hover">
              Customer help center
            </Link>{" "}
            — not this page.
          </p>
        </div>
      </div>

      <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.18em] text-vw-muted">
        For your team
      </h2>
      <GuideIndexList
        variant="grid"
        items={DOCS_NAV}
        basePath="/docs"
        getSummary={(itemSlug) => getDocGuide(itemSlug)?.summary}
        getIcon={(itemSlug) => DOC_ICONS[itemSlug as DocSlug]}
      />

      <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.18em] text-vw-muted">
        Quick links
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <li key={link.href}>
            {link.internal ? (
              <Link to={link.href} className="group vw-quick-link h-full flex-col items-start gap-0 p-5">
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-semibold text-vw-headline">{link.title}</span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-vw-muted transition-[color,transform] duration-vw group-hover:translate-x-0.5 group-hover:text-vw-accent" />
                </div>
                <span className="mt-2 text-sm leading-relaxed text-vw-muted">{link.description}</span>
              </Link>
            ) : (
              <a
                href={link.href}
                className="group vw-quick-link h-full flex-col items-start gap-0 p-5"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-semibold text-vw-headline">{link.title}</span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-vw-muted transition-[color,transform] duration-vw group-hover:translate-x-0.5 group-hover:text-vw-accent" />
                </div>
                <span className="mt-2 text-sm leading-relaxed text-vw-muted">{link.description}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </DocsPageShell>
  );
}
