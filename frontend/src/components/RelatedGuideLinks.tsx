import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { GuideIndexItem } from "./GuideIndexList";

type RelatedGuideLinksProps = {
  title: string;
  basePath: string;
  currentSlug: string;
  items: readonly GuideIndexItem[];
};

export function RelatedGuideLinks({
  title,
  basePath,
  currentSlug,
  items,
}: RelatedGuideLinksProps): ReactElement {
  const related = items.filter((item) => item.slug !== currentSlug);
  if (related.length === 0) return <></>;

  return (
    <aside className="mt-14 rounded-xl border border-vw-border bg-vw-elevated/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vw-muted">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {related.map((item) => (
          <li key={item.slug}>
            <Link
              to={`${basePath}/${item.slug}`}
              className="font-medium text-vw-accent transition-colors hover:text-vw-accent-hover"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
