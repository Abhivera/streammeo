import type { ReactElement } from "react";
import { useState } from "react";
import type { WidgetSettings } from "../types";

type WidgetCustomizerProps = {
  settings: WidgetSettings;
  displayName: string;
  onChange: (patch: Partial<WidgetSettings>) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  canEdit: boolean;
};

type CustomizerSection = "content" | "colors" | "launcher" | "behavior" | "advanced";

const SECTIONS: Array<{ id: CustomizerSection; label: string; shortLabel: string }> = [
  { id: "content", label: "Content", shortLabel: "Content" },
  { id: "colors", label: "Colors", shortLabel: "Colors" },
  { id: "launcher", label: "Launcher", shortLabel: "Launcher" },
  { id: "behavior", label: "Behavior", shortLabel: "Behavior" },
  { id: "advanced", label: "Advanced", shortLabel: "Advanced" },
];

function sectionTabClass(active: boolean): string {
  return `vw-settings-tab ${active ? "vw-settings-tab-active" : ""}`;
}

function ColorField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <label className="vw-field-label">
      <span className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {hint ? <span className="text-xs font-normal text-vw-muted">{hint}</span> : null}
      </span>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          type="color"
          className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-vw-border bg-vw-elevated p-1 disabled:cursor-not-allowed"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="vw-input flex-1 font-mono text-sm"
          value={value}
          disabled={disabled}
          pattern="^#[0-9A-Fa-f]{6}$"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

function WidgetPreview({
  settings,
  displayName,
}: {
  settings: WidgetSettings;
  displayName: string;
}): ReactElement {
  const launcherRadius = settings.launcherStyle === "rounded" ? "12px" : "999px";
  const horizontal = settings.position === "bottom-left" ? "left" : "right";

  return (
    <div className="relative aspect-[4/5] min-h-[18rem] overflow-hidden rounded-xl border border-vw-border bg-gradient-to-b from-[#eef1f5] to-[#e8ebf0]">
      <div
        className="absolute bottom-4 flex h-12 w-12 items-center justify-center text-white shadow-lg"
        style={{
          [horizontal]: "16px",
          borderRadius: launcherRadius,
          backgroundColor: settings.accentColor,
        }}
        aria-hidden
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div
        className="absolute bottom-[4.75rem] w-[min(100%,14rem)] overflow-hidden rounded-2xl border border-black/5 shadow-xl"
        style={{
          [horizontal]: "16px",
          backgroundColor: settings.panelBackground,
        }}
      >
        <div className="px-4 py-3 text-white" style={{ backgroundColor: settings.accentColor }}>
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-[11px] opacity-90">{settings.headerSubtitle}</p>
        </div>
        <div className="px-4 py-5 text-center" style={{ backgroundColor: settings.chatBackground }}>
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: settings.accentColor }}
            aria-hidden
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: settings.textColor }}>
            {settings.welcomeTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: settings.mutedTextColor }}>
            {settings.welcomeMessage}
          </p>
          {settings.quickPrompts[0] ? (
            <div
              className="mt-3 rounded-lg border px-3 py-2 text-left text-xs"
              style={{
                borderColor: "#dde1e6",
                backgroundColor: settings.panelBackground,
                color: settings.textColor,
              }}
            >
              {settings.quickPrompts[0]}
            </div>
          ) : null}
        </div>
        <div
          className="border-t px-3 py-2.5"
          style={{ borderColor: "#e5e7eb", backgroundColor: settings.panelBackground }}
        >
          <div className="h-8 rounded-lg border" style={{ borderColor: "#d1d5db" }} />
        </div>
      </div>
    </div>
  );
}

function LauncherOption({
  active,
  label,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-[border-color,background-color] duration-vw disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-vw-accent/50 bg-vw-accent-surface"
          : "border-vw-border bg-vw-elevated/40 hover:border-vw-border-faint hover:bg-vw-elevated/70"
      }`}
    >
      {children}
      <span className={`text-xs font-medium ${active ? "text-vw-accent" : "text-vw-muted"}`}>{label}</span>
    </button>
  );
}

export function WidgetCustomizer({
  settings,
  displayName,
  onChange,
  onSave,
  saving,
  saved,
  canEdit,
}: WidgetCustomizerProps): ReactElement {
  const [section, setSection] = useState<CustomizerSection>("content");
  const promptsText = settings.quickPrompts.join("\n");
  const resolvedName = settings.displayName?.trim() || displayName;

  return (
    <div className="vw-panel overflow-hidden">
      <div className="border-b border-vw-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-vw-headline">Customize appearance</h2>
            <p className="mt-0.5 text-sm text-vw-muted">
              Changes apply to every site using your API key.
            </p>
          </div>
          {saved ? (
            <span className="rounded-full border border-vw-success-edge bg-vw-success-soft px-3 py-1 text-xs font-medium text-vw-success">
              Saved — reload embedded widgets to see updates
            </span>
          ) : null}
        </div>

        <nav className="vw-settings-tabs mt-4" aria-label="Widget customization sections">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={sectionTabClass(section === item.id)}
              onClick={() => setSection(item.id)}
            >
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_min(100%,18rem)] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          className="min-w-0 border-b border-vw-border px-5 py-5 sm:px-6 lg:border-b-0 lg:border-r"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          {section === "content" ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Copy & messaging</p>
              <label className="vw-field-label">
                Widget title
                <input
                  className="vw-input"
                  value={settings.displayName ?? ""}
                  placeholder={displayName}
                  disabled={!canEdit}
                  onChange={(e) =>
                    onChange({ displayName: e.target.value.trim() ? e.target.value : null })
                  }
                />
                <span className="mt-1 block text-xs text-vw-muted">
                  Leave blank to use workspace name ({displayName}).
                </span>
              </label>
              <label className="vw-field-label">
                Header subtitle
                <input
                  className="vw-input"
                  value={settings.headerSubtitle}
                  disabled={!canEdit}
                  onChange={(e) => onChange({ headerSubtitle: e.target.value })}
                />
              </label>
              <label className="vw-field-label">
                Welcome title
                <input
                  className="vw-input"
                  value={settings.welcomeTitle}
                  disabled={!canEdit}
                  onChange={(e) => onChange({ welcomeTitle: e.target.value })}
                />
              </label>
              <label className="vw-field-label">
                Welcome message
                <textarea
                  className="vw-input min-h-[5rem] resize-y"
                  rows={3}
                  value={settings.welcomeMessage}
                  disabled={!canEdit}
                  onChange={(e) => onChange({ welcomeMessage: e.target.value })}
                />
              </label>
              <label className="vw-field-label">
                Quick prompts
                <textarea
                  className="vw-input min-h-[6rem] resize-y font-mono text-sm"
                  rows={4}
                  value={promptsText}
                  disabled={!canEdit}
                  placeholder={"I need help with my order\nBilling question"}
                  onChange={(e) => {
                    const quickPrompts = e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .slice(0, 6);
                    onChange({ quickPrompts });
                  }}
                />
                <span className="mt-1 block text-xs text-vw-muted">One prompt per line, up to 6.</span>
              </label>
            </div>
          ) : null}

          {section === "colors" ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Theme colors</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="Accent"
                  hint="Header, buttons, visitor bubbles"
                  value={settings.accentColor}
                  disabled={!canEdit}
                  onChange={(accentColor) => onChange({ accentColor })}
                />
                <ColorField
                  label="Panel background"
                  hint="Widget shell & inputs"
                  value={settings.panelBackground}
                  disabled={!canEdit}
                  onChange={(panelBackground) => onChange({ panelBackground })}
                />
                <ColorField
                  label="Chat background"
                  hint="Message area"
                  value={settings.chatBackground}
                  disabled={!canEdit}
                  onChange={(chatBackground) => onChange({ chatBackground })}
                />
                <ColorField
                  label="Text"
                  value={settings.textColor}
                  disabled={!canEdit}
                  onChange={(textColor) => onChange({ textColor })}
                />
                <ColorField
                  label="Muted text"
                  hint="Subtitles & hints"
                  value={settings.mutedTextColor}
                  disabled={!canEdit}
                  onChange={(mutedTextColor) => onChange({ mutedTextColor })}
                />
              </div>
            </div>
          ) : null}

          {section === "launcher" ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Position</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <LauncherOption
                    active={settings.position === "bottom-right"}
                    label="Bottom right"
                    disabled={!canEdit}
                    onClick={() => onChange({ position: "bottom-right" })}
                  >
                    <div className="relative h-16 w-full rounded-lg border border-vw-border bg-vw-bg">
                      <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-vw-accent" />
                    </div>
                  </LauncherOption>
                  <LauncherOption
                    active={settings.position === "bottom-left"}
                    label="Bottom left"
                    disabled={!canEdit}
                    onClick={() => onChange({ position: "bottom-left" })}
                  >
                    <div className="relative h-16 w-full rounded-lg border border-vw-border bg-vw-bg">
                      <div className="absolute bottom-2 left-2 h-5 w-5 rounded-full bg-vw-accent" />
                    </div>
                  </LauncherOption>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Shape</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <LauncherOption
                    active={settings.launcherStyle === "circle"}
                    label="Circle"
                    disabled={!canEdit}
                    onClick={() => onChange({ launcherStyle: "circle" })}
                  >
                    <div
                      className="h-12 w-12 rounded-full"
                      style={{ backgroundColor: settings.accentColor }}
                    />
                  </LauncherOption>
                  <LauncherOption
                    active={settings.launcherStyle === "rounded"}
                    label="Rounded square"
                    disabled={!canEdit}
                    onClick={() => onChange({ launcherStyle: "rounded" })}
                  >
                    <div
                      className="h-12 w-12 rounded-xl"
                      style={{ backgroundColor: settings.accentColor }}
                    />
                  </LauncherOption>
                </div>
              </div>
            </div>
          ) : null}

          {section === "behavior" ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Pre-chat form</p>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-vw-fg-soft">
                    <input
                      type="checkbox"
                      checked={settings.requirePreChatName}
                      disabled={!canEdit}
                      onChange={(e) => onChange({ requirePreChatName: e.target.checked })}
                    />
                    Require visitor name
                  </label>
                  <label className="flex items-center gap-2 text-sm text-vw-fg-soft">
                    <input
                      type="checkbox"
                      checked={settings.requirePreChatEmail}
                      disabled={!canEdit}
                      onChange={(e) => onChange({ requirePreChatEmail: e.target.checked })}
                    />
                    Require visitor email
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Business hours</p>
                <label className="mt-3 flex items-center gap-2 text-sm text-vw-fg-soft">
                  <input
                    type="checkbox"
                    checked={settings.businessHoursEnabled}
                    disabled={!canEdit}
                    onChange={(e) => onChange({ businessHoursEnabled: e.target.checked })}
                  />
                  Enable offline mode outside business hours
                </label>
                {settings.businessHoursEnabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="vw-field-label">
                      Start hour
                      <input
                        type="number"
                        className="vw-input"
                        min={0}
                        max={23}
                        value={settings.businessHoursStart ?? 9}
                        disabled={!canEdit}
                        onChange={(e) => onChange({ businessHoursStart: Number(e.target.value) })}
                      />
                    </label>
                    <label className="vw-field-label">
                      End hour
                      <input
                        type="number"
                        className="vw-input"
                        min={0}
                        max={23}
                        value={settings.businessHoursEnd ?? 17}
                        disabled={!canEdit}
                        onChange={(e) => onChange({ businessHoursEnd: Number(e.target.value) })}
                      />
                    </label>
                    <label className="vw-field-label">
                      Timezone
                      <input
                        className="vw-input"
                        value={settings.businessHoursTimezone}
                        disabled={!canEdit}
                        placeholder="local or America/New_York"
                        onChange={(e) => onChange({ businessHoursTimezone: e.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
                <label className="vw-field-label mt-3">
                  Offline title
                  <input
                    className="vw-input"
                    value={settings.offlineTitle}
                    disabled={!canEdit}
                    onChange={(e) => onChange({ offlineTitle: e.target.value })}
                  />
                </label>
                <label className="vw-field-label">
                  Offline message
                  <textarea
                    className="vw-input min-h-[4rem] resize-y"
                    rows={2}
                    value={settings.offlineMessage}
                    disabled={!canEdit}
                    onChange={(e) => onChange({ offlineMessage: e.target.value })}
                  />
                </label>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Proactive message</p>
                <label className="mt-3 flex items-center gap-2 text-sm text-vw-fg-soft">
                  <input
                    type="checkbox"
                    checked={settings.proactiveEnabled}
                    disabled={!canEdit}
                    onChange={(e) => onChange({ proactiveEnabled: e.target.checked })}
                  />
                  Show &quot;Need help?&quot; bubble after delay
                </label>
                {settings.proactiveEnabled ? (
                  <div className="mt-3 space-y-3">
                    <label className="vw-field-label">
                      Delay (seconds)
                      <input
                        type="number"
                        className="vw-input"
                        min={3}
                        max={300}
                        value={settings.proactiveDelaySeconds}
                        disabled={!canEdit}
                        onChange={(e) => onChange({ proactiveDelaySeconds: Number(e.target.value) })}
                      />
                    </label>
                    <label className="vw-field-label">
                      Message
                      <input
                        className="vw-input"
                        value={settings.proactiveMessage}
                        disabled={!canEdit}
                        onChange={(e) => onChange({ proactiveMessage: e.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Post-chat CSAT</p>
                <label className="mt-3 flex items-center gap-2 text-sm text-vw-fg-soft">
                  <input
                    type="checkbox"
                    checked={settings.csatEnabled}
                    disabled={!canEdit}
                    onChange={(e) => onChange({ csatEnabled: e.target.checked })}
                  />
                  Show rating prompt when chat ends
                </label>
                {settings.csatEnabled ? (
                  <label className="vw-field-label mt-3">
                    CSAT prompt
                    <input
                      className="vw-input"
                      value={settings.csatPrompt}
                      disabled={!canEdit}
                      onChange={(e) => onChange({ csatPrompt: e.target.value })}
                    />
                  </label>
                ) : null}
              </div>

              <label className="flex items-center gap-2 text-sm text-vw-fg-soft">
                <input
                  type="checkbox"
                  checked={settings.fileUploadEnabled}
                  disabled={!canEdit}
                  onChange={(e) => onChange({ fileUploadEnabled: e.target.checked })}
                />
                Allow visitors to upload images
              </label>
            </div>
          ) : null}

          {section === "advanced" ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Icons</p>
              <label className="vw-field-label">
                Launcher icon URL
                <input
                  className="vw-input"
                  value={settings.launcherIconUrl ?? ""}
                  placeholder="https://…"
                  disabled={!canEdit}
                  onChange={(e) =>
                    onChange({ launcherIconUrl: e.target.value.trim() ? e.target.value : null })
                  }
                />
              </label>
              <label className="vw-field-label">
                Welcome avatar URL
                <input
                  className="vw-input"
                  value={settings.avatarUrl ?? ""}
                  placeholder="https://…"
                  disabled={!canEdit}
                  onChange={(e) =>
                    onChange({ avatarUrl: e.target.value.trim() ? e.target.value : null })
                  }
                />
              </label>

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Locales & widgets</p>
              <label className="vw-field-label">
                Default locale
                <input
                  className="vw-input"
                  value={settings.defaultLocale}
                  disabled={!canEdit}
                  onChange={(e) => onChange({ defaultLocale: e.target.value })}
                />
              </label>
              <label className="vw-field-label">
                Locale overrides (JSON)
                <textarea
                  className="vw-input min-h-[6rem] resize-y font-mono text-xs"
                  rows={4}
                  value={JSON.stringify(settings.locales, null, 2)}
                  disabled={!canEdit}
                  onChange={(e) => {
                    try {
                      const locales = JSON.parse(e.target.value) as WidgetSettings["locales"];
                      onChange({ locales });
                    } catch {
                      /* ignore invalid JSON while typing */
                    }
                  }}
                />
                <span className="mt-1 block text-xs text-vw-muted">
                  Embed with <code className="text-vw-fg-soft">data-locale=&quot;fr&quot;</code> to use a locale key.
                </span>
              </label>
              <label className="vw-field-label">
                Widget variants (JSON)
                <textarea
                  className="vw-input min-h-[6rem] resize-y font-mono text-xs"
                  rows={4}
                  value={JSON.stringify(settings.widgets, null, 2)}
                  disabled={!canEdit}
                  onChange={(e) => {
                    try {
                      const widgets = JSON.parse(e.target.value) as WidgetSettings["widgets"];
                      onChange({ widgets });
                    } catch {
                      /* ignore invalid JSON while typing */
                    }
                  }}
                />
                <span className="mt-1 block text-xs text-vw-muted">
                  Embed with <code className="text-vw-fg-soft">data-widget-id=&quot;eu&quot;</code> for per-site overrides.
                </span>
              </label>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-vw-border pt-5">
            {canEdit ? (
              <>
                <button type="submit" className="vw-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <p className="text-xs text-vw-muted">
                  Preview updates live on the right as you edit.
                </p>
              </>
            ) : (
              <p className="text-sm text-vw-muted">
                Only workspace admins and managers can customize the widget.
              </p>
            )}
          </div>
        </form>

        <aside className="bg-vw-elevated/30 px-5 py-5 sm:px-6 lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-vw-muted">Live preview</p>
          <p className="mt-1 text-xs text-vw-muted">{resolvedName}</p>
          <div className="mt-4">
            <WidgetPreview settings={settings} displayName={resolvedName} />
          </div>
        </aside>
      </div>
    </div>
  );
}
