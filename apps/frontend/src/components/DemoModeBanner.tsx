import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { api } from "../api/client";

export function DemoModeBanner(): ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{ ok?: boolean; demoMode?: boolean }>("/health")
      .then((r) => {
        if (!cancelled && r.data.demoMode) setVisible(true);
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="border-b border-vw-warning-edge bg-vw-warning-soft px-4 py-2.5 text-center text-sm text-vw-fg"
      role="status"
    >
      <strong className="font-semibold">Demo mode</strong> — the voice widget uses a canned reply (no Deepgram/Groq).
      Speak briefly, wait for silence, then listen for the short demo tone and transcript.
    </div>
  );
}
