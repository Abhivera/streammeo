import type { ReactElement } from "react";

export function HeroMockup({ className = "" }: { className?: string }): ReactElement {
  return (
    <div
      className={`relative mx-auto w-full max-w-lg animate-landing-in opacity-0 [animation-delay:120ms] ${className}`}
      aria-hidden
    >
      <div className="absolute -inset-4 rounded-3xl bg-vw-accent/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-vw-border bg-vw-surface shadow-vw-lg">
        <div className="flex items-center gap-2 border-b border-vw-border bg-vw-keywell px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <div className="ml-3 flex-1 truncate rounded-md border border-vw-border bg-vw-bg px-3 py-1 text-[0.65rem] text-vw-muted">
            app.streammeo.com/inbox
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-vw-muted">
            Live transcript
          </p>

          <div className="rounded-xl border border-vw-border bg-vw-keywell px-4 py-3">
            <p className="text-xs font-medium text-vw-fg-soft">Visitor</p>
            <p className="mt-1.5 text-sm leading-relaxed text-vw-muted">
              Hi — I need help with my subscription billing. It charged twice this month.
            </p>
          </div>

          <div className="rounded-xl border border-vw-accent/50 bg-vw-accent-surface px-4 py-3">
            <p className="text-xs font-medium text-vw-accent">Streammeo AI</p>
            <p className="mt-1.5 text-sm leading-relaxed text-vw-fg-soft">
              I can see the duplicate charge. I&apos;ve opened ticket #1842 and flagged it for
              billing — an agent will confirm the refund within 2 hours.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-vw-border bg-vw-keywell px-4 py-3">
            <div>
              <p className="text-xs font-medium text-vw-fg-soft">Live chat widget</p>
              <p className="mt-0.5 text-[0.65rem] text-vw-muted">Visitor connected · SLA on track</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-vw-accent shadow-[0_0_24px_rgba(255,30,45,0.45)]">
              <svg
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
