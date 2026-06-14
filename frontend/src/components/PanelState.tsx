import type { ReactElement, ReactNode } from "react";

type PanelStateProps = {
  loading: boolean;
  empty: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  children: ReactNode;
};

export function PanelState({
  loading,
  empty,
  loadingMessage = "Loading…",
  emptyMessage = "Nothing here yet.",
  children,
}: PanelStateProps): ReactElement {
  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="vw-skeleton h-10 rounded-lg" />
        ))}
        <p className="sr-only">{loadingMessage}</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-sm text-vw-muted">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
