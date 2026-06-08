import { useEffect } from "react";

const BASE_TITLE = "Streammeo";

export function usePageTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : `${BASE_TITLE} — AI customer service & ticketing`;
  }, [title]);
}
