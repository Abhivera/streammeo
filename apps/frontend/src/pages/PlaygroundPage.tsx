import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Workspace } from "../types";

const PLAYGROUND_INIT = "streammeo-playground-init";

function widgetBackendUrl(): string {
  const u = import.meta.env.VITE_API_URL?.trim();
  return u && u.length > 0 ? u : "";
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
        lang: workspace.language,
        backendUrl: widgetBackendUrl(),
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
        className="mx-auto max-w-2xl rounded-xl border border-vw-danger-edge bg-vw-bg px-5 py-4 text-sm text-vw-danger-soft"
        role="alert"
      >
        {loadError}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse rounded-xl border border-vw-border bg-vw-surface px-5 py-10 text-center text-sm text-vw-muted">
        Loading playground…
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vw-border-softer px-5 py-4 sm:px-6">
          <div className="text-sm">
            <span className="text-vw-fg-soft">Workspace </span>
            <span className="font-semibold text-vw-fg">{workspace.name}</span>
            <span className="text-vw-fg-soft"> · </span>
            <span className="text-vw-fg-soft">lang </span>
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
            Mic access required in the browser. Run the API (for example{" "}
            <code className="rounded bg-vw-bg px-1 py-0.5 font-mono text-[0.7rem] text-vw-fg-soft ring-1 ring-vw-border-faint">
              npm run dev:backend
            </code>
            ). If the button never loads, build the widget:{" "}
            <code className="rounded bg-vw-bg px-1 py-0.5 font-mono text-[0.7rem] text-vw-fg-soft ring-1 ring-vw-border-faint">
              npm run -w @streammeo/widget build
            </code>
            .
          </p>
          <div>
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-vw-muted">
              Live preview
            </p>
            <div className="rounded-2xl border border-vw-border bg-vw-bg p-2 shadow-vw-lg ring-1 ring-vw-border-faint sm:p-3">
              <div className="overflow-hidden rounded-xl border border-vw-border-faint bg-vw-embed-preview-muted shadow-inner">
                <iframe
                  ref={iframeRef}
                  title="Voice support preview"
                  className="h-[min(70vh,560px)] w-full border-0 bg-vw-embed-preview-muted"
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
