import type { ReactElement } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LegalPageShell } from "../components/LegalPageShell";
import { LEGAL_NAV } from "../legal/constants";
import { getLegalPolicy } from "../legal/policies";

export function LegalDocumentPage(): ReactElement {
  const { slug = "" } = useParams<{ slug: string }>();
  const policy = getLegalPolicy(slug);

  if (!policy) {
    return <Navigate to="/" replace />;
  }

  return (
    <LegalPageShell title={policy.title} summary={policy.summary}>
      <article className="mt-10 space-y-10">
        {policy.sections.map((section) => (
          <section key={section.title} aria-labelledby={`section-${section.title}`}>
            <h2
              id={`section-${section.title}`}
              className="text-xl font-semibold tracking-tight text-vw-headline"
            >
              {section.title}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-vw-fg-soft sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </article>

      <aside className="mt-14 rounded-xl border border-vw-border bg-vw-elevated/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vw-muted">Related policies</p>
        <ul className="mt-3 space-y-2 text-sm">
          {LEGAL_NAV.filter((item) => item.slug !== slug).map((item) => (
            <li key={item.slug}>
              <Link
                to={`/legal/${item.slug}`}
                className="font-medium text-vw-accent transition-colors hover:text-vw-accent-hover"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </LegalPageShell>
  );
}

export function LegalIndexPage(): ReactElement {
  return (
    <LegalPageShell
      title="Legal"
      summary="Policies that govern use of the Streammeo dashboard, API, and embeddable live chat widget."
    >
      <ul className="mt-10 divide-y divide-vw-border-softer rounded-xl border border-vw-border bg-vw-surface">
        {LEGAL_NAV.map((item) => {
          const policy = getLegalPolicy(item.slug);
          return (
            <li key={item.slug}>
              <Link
                to={`/legal/${item.slug}`}
                className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-vw-elevated/80 sm:px-6 sm:py-5"
              >
                <span className="font-semibold text-vw-headline">{item.label}</span>
                {policy ? (
                  <span className="text-sm leading-relaxed text-vw-fg-soft">{policy.summary}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </LegalPageShell>
  );
}
