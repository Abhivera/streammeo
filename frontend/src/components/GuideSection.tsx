import type { ReactElement } from "react";
import type { DocSection } from "../docs/types";

type GuideSectionProps = {
  section: DocSection;
  idPrefix: string;
};

export function GuideSection({ section, idPrefix }: GuideSectionProps): ReactElement {
  const sectionId = `${idPrefix}-${section.title}`;

  return (
    <section aria-labelledby={sectionId}>
      <h2 id={sectionId} className="text-xl font-semibold tracking-tight text-vw-headline">
        {section.title}
      </h2>
      {section.paragraphs?.length ? (
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-vw-fg-soft sm:text-base">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      {section.steps?.length ? (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-vw-fg-soft sm:text-base">
          {section.steps.map((step) => (
            <li key={step.slice(0, 48)}>{step}</li>
          ))}
        </ol>
      ) : null}
      {section.code ? (
        <pre className="mt-4 overflow-x-auto rounded-xl border border-vw-border bg-vw-keywell p-4 text-xs leading-relaxed text-vw-fg-soft">
          {section.code}
        </pre>
      ) : null}
    </section>
  );
}
