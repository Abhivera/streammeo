import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon } from "./NavIcons";

type GuideIndexItem = Readonly<{
  slug: string;
  label: string;
}>;

export type { GuideIndexItem };

type GuideIndexListProps = {
  items: readonly GuideIndexItem[];
  basePath: string;
  getSummary?: (slug: string) => string | undefined;
  getIcon?: (slug: string) => ReactNode;
  variant?: "list" | "grid";
};

export function GuideIndexList({
  items,
  basePath,
  getSummary,
  getIcon,
  variant = "list",
}: GuideIndexListProps): ReactElement {
  if (variant === "grid") {
    return (
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const summary = getSummary?.(item.slug);
          const icon = getIcon?.(item.slug);

          return (
            <li key={item.slug}>
              <Link
                to={`${basePath}/${item.slug}`}
                className="group vw-panel flex h-full flex-col p-5 transition-[border-color,transform,box-shadow] duration-vw ease-out-expo hover:-translate-y-0.5 hover:border-vw-accent/30 hover:shadow-vw-lg sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  {icon ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vw-accent/10 text-vw-accent">
                      {icon}
                    </span>
                  ) : (
                    <span className="h-10 w-10 shrink-0" aria-hidden />
                  )}
                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-vw-muted transition-[color,transform] duration-vw group-hover:translate-x-0.5 group-hover:text-vw-accent" />
                </div>
                <span className="mt-4 font-semibold text-vw-headline">{item.label}</span>
                {summary ? (
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-vw-muted">{summary}</span>
                ) : null}
                <span className="mt-4 text-xs font-medium text-vw-accent opacity-0 transition-opacity duration-vw group-hover:opacity-100">
                  Read guide
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="mt-10 divide-y divide-vw-border-softer rounded-xl border border-vw-border bg-vw-surface">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            to={`${basePath}/${item.slug}`}
            className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-vw-elevated/80 sm:px-6 sm:py-5"
          >
            <span className="font-semibold text-vw-headline">{item.label}</span>
            {getSummary?.(item.slug) ? (
              <span className="text-sm leading-relaxed text-vw-fg-soft">
                {getSummary(item.slug)}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
