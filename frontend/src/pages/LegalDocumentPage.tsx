import type { ReactElement } from "react";
import { Navigate, useParams } from "react-router-dom";
import { GuideIndexList } from "../components/GuideIndexList";
import { GuideSection } from "../components/GuideSection";
import { LegalPageShell } from "../components/LegalPageShell";
import { RelatedGuideLinks } from "../components/RelatedGuideLinks";
import { usePageTitle } from "../hooks/usePageTitle";
import { LEGAL_NAV } from "../legal/constants";
import { getLegalPolicy } from "../legal/policies";

export function LegalDocumentPage(): ReactElement {
  const { slug = "" } = useParams<{ slug: string }>();
  const policy = getLegalPolicy(slug);

  usePageTitle(policy?.title ?? "Legal");

  if (!policy) {
    return <Navigate to="/" replace />;
  }

  return (
    <LegalPageShell title={policy.title} summary={policy.summary}>
      <article className="mt-10 space-y-10">
        {policy.sections.map((section) => (
          <GuideSection key={section.title} idPrefix="legal" section={section} />
        ))}
      </article>

      <RelatedGuideLinks
        title="Related policies"
        basePath="/legal"
        currentSlug={slug}
        items={LEGAL_NAV}
      />
    </LegalPageShell>
  );
}

export function LegalIndexPage(): ReactElement {
  usePageTitle("Legal");

  return (
    <LegalPageShell
      title="Legal"
      summary="Policies that govern use of the Streammeo dashboard, API, and embeddable live chat widget."
    >
      <GuideIndexList
        items={LEGAL_NAV}
        basePath="/legal"
        getSummary={(itemSlug) => getLegalPolicy(itemSlug)?.summary}
      />
    </LegalPageShell>
  );
}
