import type { ReactElement, ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, children }: PageHeaderProps): ReactElement {
  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${children ? "sm:flex-row sm:items-end sm:justify-between" : ""}`}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="vw-section-eyebrow">{eyebrow}</p> : null}
        <h1 className={`vw-page-title ${eyebrow ? "mt-2" : ""}`}>{title}</h1>
        {description ? <p className="vw-page-lede">{description}</p> : null}
      </div>
      {children ? (
        <div className="w-full min-w-0 shrink-0 sm:max-w-xs md:max-w-sm lg:w-auto lg:max-w-none">
          {children}
        </div>
      ) : null}
    </div>
  );
}
