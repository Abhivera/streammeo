import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";

function Reveal({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}): ReactElement {
  return (
    <div
      className={`motion-safe:animate-landing-in opacity-0 motion-reduce:animate-none motion-reduce:opacity-100 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function IconEmbed(): ReactElement {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 9l-3 3 3 3M16 15l3-3-3-3M14 8l-4 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWaveform(): ReactElement {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12v.01M8 8v8M12 5v14M16 9v6M20 12v.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrend(): ReactElement {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18h16M7 14l3-3 3 2 5-6M17 7v4h-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicGlyph(): ReactElement {
  return (
    <svg className="h-6 w-6 text-vw-accent-fg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 3v3m-3 0h6" />
    </svg>
  );
}

function HeroProductMockup(): ReactElement {
  return (
    <figure className="relative">
      <div
        className="absolute -right-6 -top-6 hidden h-32 w-32 rounded-2xl border border-vw-accent-edge bg-vw-accent-veil sm:block lg:-right-10 lg:-top-10"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-vw-border bg-vw-surface shadow-vw-lg">
        <div className="flex items-center gap-3 border-b border-vw-border-softer bg-vw-elevated px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-vw-danger/85" />
            <span className="h-2.5 w-2.5 rounded-full bg-vw-warning/55" />
            <span className="h-2.5 w-2.5 rounded-full bg-vw-accent/75" />
          </div>
          <div className="min-w-0 flex-1 truncate rounded-md border border-vw-border-faint bg-vw-keywell px-3 py-1.5 text-left text-xs text-vw-muted">
            yourstore.com · checkout
          </div>
        </div>

        <div className="relative min-h-[min(320px,42vw)] bg-gradient-to-b from-vw-embed-preview-muted to-vw-embed-preview p-5 pb-28 sm:min-h-[360px] sm:p-6 sm:pb-32">
          <div className="mx-auto max-w-md rounded-xl border border-vw-accent/25 bg-vw-embed-preview p-4 text-left shadow-vw sm:p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-vw-muted">Live transcript</p>
            <div className="mt-4 space-y-3 text-sm leading-snug text-vw-embed-body">
              <div className="rounded-lg bg-vw-embed-preview-muted px-3 py-2.5">
                <span className="text-[0.7rem] font-medium text-vw-muted">Visitor</span>
                <p className="mt-1">Where is my order?</p>
              </div>
              <div className="rounded-lg border border-vw-accent/35 bg-vw-embed-preview-muted px-3 py-2.5">
                <span className="text-[0.7rem] font-medium text-vw-muted">Streammeo</span>
                <p className="mt-1 text-vw-fg">
                  Shipped yesterday via Delhivery — tracking starts with DL… ETA two to three days.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-3 rounded-full border border-vw-border bg-vw-surface/95 px-4 py-2.5 shadow-vw-lg backdrop-blur-sm sm:inset-x-6 sm:bottom-6 sm:px-5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-vw-fg">Voice support</p>
              <p className="truncate text-[0.7rem] text-vw-muted">Tap the mic — stays on your site</p>
            </div>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vw-accent shadow-vw ring-2 ring-vw-accent-ring/40"
              aria-hidden
            >
              <MicGlyph />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-sm leading-snug text-vw-fg-soft sm:px-1">
        Same site, same checkout: voice support without another app or ticket queue.
      </figcaption>
    </figure>
  );
}

const TRUST_PLATFORMS = ["Shopify", "WooCommerce", "Webflow", "WordPress", "Custom HTML"] as const;

export function LandingPage(): ReactElement {
  return (
    <div className="min-h-screen bg-vw-bg font-brand text-vw-fg">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(232, 250, 244, 0.95) 0%, transparent 52%), radial-gradient(90% 70% at 100% 30%, rgba(197, 233, 218, 0.5) 0%, transparent 48%)",
        }}
      />

      <header className="relative z-10 border-b border-vw-border-softer bg-vw-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-semibold tracking-tight text-vw-headline">
            Streammeo
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Marketing">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-vw-fg-soft transition-colors duration-vw ease-out-expo hover:bg-vw-elevated hover:text-vw-fg"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-vw-accent px-4 py-2 text-sm font-semibold text-vw-accent-fg shadow-vw transition-[background-color,transform] duration-vw ease-out-expo hover:bg-vw-accent-hover active:scale-[0.99]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8 lg:pb-16 lg:pt-20">
          <div className="lg:col-span-6 lg:pt-4">
            <Reveal style={{ animationDelay: "40ms" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vw-accent">
                AI voice customer support
              </p>
            </Reveal>
            <Reveal style={{ animationDelay: "120ms" }}>
              <h1 className="mt-5 max-w-[14ch] text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-vw-headline">
                First-line support customers can actually talk to.
              </h1>
            </Reveal>
            <Reveal style={{ animationDelay: "200ms" }}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-vw-fg-soft sm:text-xl">
                Voice answers on your site—no extra app, no ticket queue—powered by your FAQs and tools, with full
                transcripts in one console.
              </p>
            </Reveal>
            <Reveal
              className="mt-10 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "280ms" }}
            >
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-vw-accent px-6 py-3.5 text-base font-semibold text-vw-accent-fg shadow-vw-lg transition-[background-color,transform] duration-vw ease-out-expo hover:bg-vw-accent-hover active:scale-[0.99]"
              >
                Create workspace — free
              </Link>
              <Link
                to="/login"
                className="text-base font-medium text-vw-accent underline decoration-vw-accent-strong underline-offset-4 transition-colors duration-vw ease-out-expo hover:text-vw-accent-hover"
              >
                I already have an account
              </Link>
            </Reveal>
          </div>

          <div className="relative mt-14 lg:col-span-6 lg:mt-0">
            <Reveal className="relative" style={{ animationDelay: "200ms" }}>
              <HeroProductMockup />
            </Reveal>
          </div>
        </section>

        <section
          className="relative z-10 border-t border-vw-border-softer bg-vw-surface/30 py-10"
          aria-label="Platforms"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-vw-muted">
              Powers support at
            </p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 sm:gap-x-14">
              {TRUST_PLATFORMS.map((name) => (
                <li
                  key={name}
                  className="text-sm font-semibold tracking-tight text-vw-fg-soft/90 transition-colors duration-vw hover:text-vw-fg"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="relative z-10 border-t border-vw-border-softer bg-vw-surface/40 py-20"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="how-heading" className="text-3xl font-bold tracking-tight text-vw-headline sm:text-4xl">
                From embed to resolved question
              </h2>
              <p className="mt-4 text-base leading-relaxed text-vw-fg-soft sm:text-lg">
                No extra app for visitors. You keep your stack; we handle capture, models, playback, and a support-ready
                history your staff can learn from.
              </p>
            </div>

            <ol className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8 lg:gap-12">
              {[
                {
                  step: "01",
                  title: "Offer voice on your site",
                  body: "Paste the widget by checkout or help. Shadow DOM keeps styles off your theme so support feels native.",
                  icon: <IconEmbed />,
                },
                {
                  step: "02",
                  title: "Answer with your policies",
                  body: "Speech streams over Socket.IO. Deepgram transcribes and speaks; Groq reasons and can call FAQ search, order lookup, and optional web search.",
                  icon: <IconWaveform />,
                },
                {
                  step: "03",
                  title: "Improve like a support team",
                  body: "Read transcripts, spot repeat questions, and refine FAQs and prompts so the next visitor gets a clearer answer.",
                  icon: <IconTrend />,
                },
              ].map((item) => (
                <li key={item.step} className="sm:pt-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-vw-border bg-vw-elevated text-vw-accent">
                    {item.icon}
                  </div>
                  <span
                    className="mt-4 block text-xs font-bold tabular-nums tracking-[0.35em] text-vw-accent"
                    aria-hidden
                  >
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-vw-headline">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-vw-fg-soft">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="relative z-10 py-20" aria-labelledby="voice-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
              <div className="max-w-xl shrink-0">
                <h2 id="voice-heading" className="text-3xl font-bold tracking-tight text-vw-headline sm:text-4xl">
                  Support workflows, not just audio
                </h2>
                <p className="mt-4 text-base leading-relaxed text-vw-fg-soft">
                  English speech end-to-end. Sessions, transcripts, and top questions live in the console so you can
                  coach the agent like tier-0 support: consistent tone, searchable history, fewer repeated tickets.
                </p>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-10">
                <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
                  <div className="rounded-2xl border border-vw-border-softer bg-vw-elevated/80 px-4 py-5 sm:px-5 sm:py-6">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-vw-muted">
                      First-contact resolution
                    </dt>
                    <dd className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-vw-headline sm:text-4xl">
                      73%
                    </dd>
                    <p className="mt-1 text-xs text-vw-fg-soft">Typical teams after FAQ tuning</p>
                  </div>
                  <div className="rounded-2xl border border-vw-border-softer bg-vw-elevated/80 px-4 py-5 sm:px-5 sm:py-6">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-vw-muted">
                      Median reply latency
                    </dt>
                    <dd className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-vw-headline sm:text-4xl">
                      &lt;2s
                    </dd>
                    <p className="mt-1 text-xs text-vw-fg-soft">From end of speech to first audio</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-vw-border-softer bg-vw-elevated/80 px-4 py-5 sm:col-span-1 sm:px-5 sm:py-6">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-vw-muted">
                      Handoff friction
                    </dt>
                    <dd className="mt-2 text-3xl font-extrabold tracking-tight text-vw-headline sm:text-4xl">Zero</dd>
                    <p className="mt-1 text-xs text-vw-fg-soft">Guests never leave your domain</p>
                  </div>
                </dl>

                <ul className="flex flex-wrap gap-3 text-sm font-medium text-vw-headline" aria-label="Support highlights">
                  <li className="rounded-full border border-vw-border bg-vw-elevated px-4 py-2 tracking-tight">
                    English voice
                  </li>
                  <li className="rounded-full border border-vw-border bg-vw-elevated px-4 py-2 tracking-tight">
                    FAQ-backed
                  </li>
                  <li className="rounded-full border border-vw-border bg-vw-elevated px-4 py-2 tracking-tight">
                    Transcripts
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-vw-border bg-vw-accent px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-vw-accent-fg sm:text-3xl">
                Ready for the next “where is my order?” moment.
              </h2>
              <p className="mt-2 max-w-xl text-vw-accent-fg/90">
                Spin up a workspace, rehearse answers in the playground, load your FAQs, then embed when the flow feels
                right for real customers.
              </p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
              <Link
                to="/register"
                className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-vw-accent-fg/30 bg-vw-bg px-6 py-3.5 text-base font-semibold text-vw-headline shadow-vw transition-[transform,background-color] duration-vw ease-out-expo hover:bg-vw-surface active:scale-[0.99]"
              >
                Start free
              </Link>
              <p className="text-center text-sm font-medium text-vw-accent-fg/85 sm:text-right">No card needed</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-vw-border bg-vw-surface px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-vw-muted">Streammeo · AI voice customer support for the web</p>
          <div className="flex gap-6 text-sm font-medium text-vw-fg-soft">
            <Link to="/login" className="transition-colors hover:text-vw-fg">
              Log in
            </Link>
            <Link to="/register" className="transition-colors hover:text-vw-fg">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
