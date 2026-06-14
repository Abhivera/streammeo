import type { ReactElement, ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: "inbox" | "chat" | "search" | "team";
  compact?: boolean;
  children?: ReactNode;
};

const ICONS: Record<NonNullable<EmptyStateProps["icon"]>, ReactElement> = {
  inbox: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 0 6.586 13H4"
    />
  ),
  chat: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
    />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </>
  ),
  team: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
  ),
};

export function EmptyState({
  title,
  description,
  icon = "inbox",
  compact = false,
  children,
}: EmptyStateProps): ReactElement {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-8" : "px-6 py-16"}`}
    >
      <div className={`relative ${compact ? "mb-3" : "mb-5"}`}>
        {!compact ? (
          <div
            className="absolute inset-0 rounded-2xl blur-xl"
            style={{ background: "radial-gradient(circle, rgba(255,30,45,0.15) 0%, transparent 70%)" }}
            aria-hidden
          />
        ) : null}
        <div
          className={`relative flex items-center justify-center rounded-2xl border border-vw-border bg-vw-elevated shadow-vw ${compact ? "h-10 w-10" : "h-14 w-14"}`}
        >
          <svg
            className={`text-vw-muted ${compact ? "h-5 w-5" : "h-6 w-6"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            {ICONS[icon]}
          </svg>
        </div>
      </div>
      <p className={`font-medium text-vw-headline ${compact ? "text-sm" : "text-base"}`}>{title}</p>
      {description ? (
        <p className={`max-w-sm leading-relaxed text-vw-muted ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}>
          {description}
        </p>
      ) : null}
      {children ? <div className={compact ? "mt-4" : "mt-6"}>{children}</div> : null}
    </div>
  );
}
