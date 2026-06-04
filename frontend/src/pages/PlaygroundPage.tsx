import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Workspace } from "../types";

const PLAYGROUND_INIT = "streammeo-playground-init";

function MicPreviewIcon(): ReactElement {
  return (
    <svg
      className="h-14 w-14 text-vw-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v3M8 21h8" />
    </svg>
  );
}

function widgetBackendUrl(): string {
  const u = import.meta.env.VITE_API_URL?.trim();
  return u && u.length > 0 ? u : "";
}

/**
 * Where the embeddable widget bundle is served from. The widget is built and
 * hosted by the backend project; set VITE_WIDGET_URL to its CDN/host URL.
 * Falls back to a same-origin `/widget.js` (drop a built copy in `public/`).
 */
function widgetSrcUrl(): string {
  const u = import.meta.env.VITE_WIDGET_URL?.trim();
  return u && u.length > 0 ? u : "/widget.js";
}

function appSyncConfig(): { url: string; apiKey: string } {
  return {
    url: import.meta.env.VITE_APPSYNC_GRAPHQL_URL?.trim() ?? "",
    apiKey: import.meta.env.VITE_APPSYNC_API_KEY?.trim() ?? "",
  };
}

export function PlaygroundPage(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoaded = useRef(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<Workspace>("/workspace")
      .then((r) => setWorkspace(r.data))
      .catch(() => setLoadError("Could not load workspace."));
  }, []);

  const postInit = useCallback((): void => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !workspace) return;
    win.postMessage(
      {
        type: PLAYGROUND_INIT,
        apiKey: workspace.apiKey,
        backendUrl: widgetBackendUrl(),
        widgetUrl: widgetSrcUrl(),
        appSyncUrl: appSyncConfig().url,
        appSyncApiKey: appSyncConfig().apiKey,
      },
      window.location.origin,
    );
  }, [workspace]);

  const onIframeLoad = useCallback(() => {
    iframeLoaded.current = true;
    postInit();
  }, [postInit]);

  useEffect(() => {
    if (iframeLoaded.current) postInit();
  }, [postInit, workspace]);

  if (loadError) {
    return (
      <div
        className="mx-auto max-w-2xl rounded-xl border border-vw-danger-edge bg-vw-surface px-5 py-4 text-sm text-vw-danger"
        role="alert"
      >
        {loadError}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 rounded-xl border border-vw-border bg-vw-surface px-8 py-16 text-center shadow-vw sm:py-20">
        <MicPreviewIcon />
        <div className="max-w-sm space-y-2">
          <p className="text-base font-semibold tracking-tight text-vw-headline">Loading your playground…</p>
          <p className="text-sm leading-relaxed text-vw-muted">
            In a moment you&apos;ll see the same embed your customers get: a mic in the corner of the preview. When it
            appears, tap it and allow the microphone so silence detection and replies can work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <header className="max-w-2xl">
        <h1 className="vw-page-title">Playground</h1>
        <p className="vw-page-lede">
          Rehearse your voice support widget against this workspace before customers hit it live. The preview runs in an
          isolated frame (same as a page that embeds your script). Use the mic, pause briefly after speaking so silence
          detection can end the turn, then listen for the reply.
        </p>
      </header>

      <section className="vw-panel space-y-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vw-border px-5 py-4 sm:px-6">
          <div className="text-sm">
            <span className="text-vw-muted">Workspace </span>
            <span className="font-semibold text-vw-headline">{workspace.name}</span>
            <span className="text-vw-muted"> · </span>
            <span className="text-vw-muted">lang </span>
            <span className="rounded-md bg-vw-elevated px-1.5 py-0.5 font-medium tabular-nums text-vw-fg">
              {workspace.language}
            </span>
          </div>
          <Link to="/settings" className="vw-btn-secondary text-xs shrink-0">
            Edit agent &amp; prompt
          </Link>
        </div>
        <div className="space-y-3 px-5 pb-5 pt-4 sm:px-6">
          <p className="vw-hint">
            Mic access required in the browser. Run the backend API (from the{" "}
            <code className="rounded bg-vw-keywell px-1 py-0.5 font-mono text-[0.7rem] text-vw-fg ring-1 ring-vw-border">
              backend/
            </code>{" "}
            project:{" "}
            <code className="rounded bg-vw-keywell px-1 py-0.5 font-mono text-[0.7rem] text-vw-fg ring-1 ring-vw-border">
              npm run dev
            </code>
            ). If the button never loads, point{" "}
            <code className="rounded bg-vw-keywell px-1 py-0.5 font-mono text-[0.7rem] text-vw-fg ring-1 ring-vw-border">
              VITE_WIDGET_URL
            </code>{" "}
            at your hosted widget bundle (or drop a built{" "}
            <code className="rounded bg-vw-keywell px-1 py-0.5 font-mono text-[0.7rem] text-vw-fg ring-1 ring-vw-border">
              widget.js
            </code>{" "}
            into{" "}
            <code className="rounded bg-vw-keywell px-1 py-0.5 font-mono text-[0.7rem] text-vw-fg ring-1 ring-vw-border">
              public/
            </code>
            ).
          </p>
          <div>
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-vw-muted">
              Live preview
            </p>
            <div className="rounded-2xl border border-vw-border bg-vw-keywell p-2 shadow-vw-lg ring-1 ring-vw-border sm:p-3">
              <div className="overflow-hidden rounded-xl border border-vw-border bg-vw-embed-preview-muted shadow-inner ring-1 ring-vw-accent/10">
                <iframe
                  ref={iframeRef}
                  title="Voice support preview"
                  className="h-[min(70vh,560px)] w-full border-0 bg-transparent"
                  src="/playground-widget-host.html"
                  onLoad={onIframeLoad}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
