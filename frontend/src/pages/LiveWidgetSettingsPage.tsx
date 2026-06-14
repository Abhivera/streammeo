import type { ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { WidgetCustomizer } from "../components/WidgetCustomizer";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchWidgetSettings, updateWidgetSettings } from "../api/client";
import { getPublicApiUrl, isRemoteApi } from "../config";
import { DEFAULT_WIDGET_SETTINGS } from "../lib/widgetSettings";
import { useAuthStore } from "../store/auth";
import type { WidgetSettings } from "../types";

export function LiveWidgetSettingsPage(): ReactElement {
  usePageTitle("Live widget");
  const user = useAuthStore((s) => s.user);
  const canCustomizeWidget = user?.role === "admin" || user?.role === "manager";
  const workspace = useAuthStore((s) => s.workspace);

  const [widgetDraft, setWidgetDraft] = useState<WidgetSettings | null>(null);
  const [widgetSaving, setWidgetSaving] = useState(false);
  const [widgetSaved, setWidgetSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const widgetSettingsQuery = useAsyncData(
    () => (workspace?.apiKey ? fetchWidgetSettings() : Promise.resolve(null)),
    [workspace?.apiKey],
  );
  const loadedWidgetSettings =
    widgetSettingsQuery.data?.settings ?? DEFAULT_WIDGET_SETTINGS;
  const widgetSettings = widgetDraft ?? loadedWidgetSettings;

  const apiBase = getPublicApiUrl();
  const widgetSnippet = workspace?.apiKey
    ? `<script src="${window.location.origin}/chat-widget.js" data-api-key="${workspace.apiKey}" data-api-url="${apiBase}"></script>\n<!-- Optional: data-locale="fr" data-widget-id="eu" data-accent="#FF1E2D" -->`
    : null;
  const widgetNote = isRemoteApi()
    ? null
    : "For production embeds, set VITE_API_URL to your API Gateway URL so the widget calls Lambda, not localhost.";

  const handleWidgetSettingsChange = (patch: Partial<WidgetSettings>) => {
    setWidgetSaved(false);
    setWidgetDraft((prev) => ({ ...(prev ?? loadedWidgetSettings), ...patch }));
  };

  const handleSaveWidgetSettings = async () => {
    setWidgetSaving(true);
    setWidgetSaved(false);
    try {
      const data = await updateWidgetSettings(widgetSettings);
      widgetSettingsQuery.setData(data);
      setWidgetDraft(null);
      setWidgetSaved(true);
    } catch {
      alert("Could not save widget customization. Check your permissions and try again.");
    } finally {
      setWidgetSaving(false);
    }
  };

  const handleCopySnippet = async () => {
    if (!widgetSnippet) return;
    try {
      await navigator.clipboard.writeText(widgetSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy to clipboard.");
    }
  };

  if (!widgetSnippet) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Live chat widget"
          description="Embed real-time chat on your website. Your workspace API key is required to configure the widget."
        />
        <p className="text-sm text-vw-muted">Workspace API key is not available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live chat widget"
        description="Customize how the embed looks, then paste the script on your site. Visitors can chat in real time; conversations convert to tickets when needed."
      />

      <section className="vw-panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-vw-border px-5 py-4 sm:px-6">
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-semibold text-vw-headline">Embed snippet</h2>
            <p className="text-sm text-vw-muted">
              Paste before <code className="text-vw-fg-soft">&lt;/body&gt;</code> on any page.{" "}
              <a
                href="/docs/live-chat-widget"
                className="font-medium text-vw-accent hover:text-vw-accent-hover"
              >
                Embed guide
              </a>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={`/widget-demo.html?apiKey=${encodeURIComponent(workspace?.apiKey ?? "")}&apiUrl=${encodeURIComponent(apiBase)}`}
              className="vw-btn-secondary text-sm"
            >
              Open demo
            </a>
            <button
              type="button"
              className="vw-btn-secondary text-sm"
              onClick={() => void handleCopySnippet()}
            >
              {copied ? "Copied" : "Copy snippet"}
            </button>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4 sm:px-6">
          <pre className="overflow-x-auto rounded-lg bg-vw-elevated p-4 text-xs text-vw-fg-soft">
            {widgetSnippet}
          </pre>
          {widgetNote ? <p className="text-xs text-vw-warning">{widgetNote}</p> : null}
          <p className="text-xs text-vw-muted">
            Appearance loads from the settings below. Add <code className="text-vw-fg-soft">data-accent</code>,{" "}
            <code className="text-vw-fg-soft">data-locale</code>, or{" "}
            <code className="text-vw-fg-soft">data-widget-id</code> on the script tag for per-site overrides.
          </p>
        </div>
      </section>

      {widgetSettingsQuery.loading ? (
        <p className="text-sm text-vw-muted">Loading widget settings…</p>
      ) : (
        <WidgetCustomizer
          settings={widgetSettings}
          displayName={workspace?.name ?? "Support"}
          onChange={handleWidgetSettingsChange}
          onSave={() => void handleSaveWidgetSettings()}
          saving={widgetSaving}
          saved={widgetSaved}
          canEdit={canCustomizeWidget}
        />
      )}
    </div>
  );
}
