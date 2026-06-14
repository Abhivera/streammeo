import type { ReactElement } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { GuideIndexList } from "../components/GuideIndexList";
import { GuideSection } from "../components/GuideSection";
import { HelpPageShell } from "../components/HelpPageShell";
import { RelatedGuideLinks } from "../components/RelatedGuideLinks";
import { HELP_NAV } from "../help/constants";
import { getHelpGuide } from "../help/guides";
import { usePageTitle } from "../hooks/usePageTitle";

export function HelpDocumentPage(): ReactElement {
  const { slug = "" } = useParams<{ slug: string }>();
  const guide = getHelpGuide(slug);

  usePageTitle(guide?.title ?? "Help center");

  if (!guide) {
    return <Navigate to="/help" replace />;
  }

  return (
    <HelpPageShell title={guide.title} summary={guide.summary}>
      <article className="mt-10 space-y-10">
        {guide.sections.map((section) => (
          <GuideSection key={section.title} idPrefix="help" section={section} />
        ))}
      </article>

      <RelatedGuideLinks
        title="More help topics"
        basePath="/help"
        currentSlug={slug}
        items={HELP_NAV}
      />
    </HelpPageShell>
  );
}

export function HelpIndexPage(): ReactElement {
  usePageTitle("Help center");

  return (
    <HelpPageShell
      title="Customer help center"
      summary="How to contact support, use live chat, track your ticket, and share feedback — when a company uses Streammeo to help you."
    >
      <GuideIndexList
        items={HELP_NAV}
        basePath="/help"
        getSummary={(itemSlug) => getHelpGuide(itemSlug)?.summary}
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-vw-border bg-vw-surface p-5">
          <p className="font-semibold text-vw-headline">Have a ticket link?</p>
          <p className="mt-2 text-sm text-vw-muted">
            Open the link from your email to view and reply.{" "}
            <Link to="/help/track-your-request" className="text-vw-accent hover:text-vw-accent-hover">
              How ticket tracking works
            </Link>
          </p>
        </div>
        <div className="rounded-xl border border-vw-border bg-vw-surface p-5">
          <p className="font-semibold text-vw-headline">Got a survey email?</p>
          <p className="mt-2 text-sm text-vw-muted">
            Rate your support after an issue is resolved.{" "}
            <Link to="/help/rate-your-experience" className="text-vw-accent hover:text-vw-accent-hover">
              About satisfaction surveys
            </Link>
          </p>
        </div>
      </div>
    </HelpPageShell>
  );
}
