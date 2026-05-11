import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=80";

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

export function LandingPage(): ReactElement {
  return (
    <div className="min-h-screen bg-vw-bg font-brand text-vw-fg">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, oklch(0.32 0.09 64 / 0.35) 0%, transparent 55%), radial-gradient(90% 60% at 100% 20%, oklch(0.22 0.05 74 / 0.48) 0%, transparent 50%)",
        }}
      />

      <header className="relative z-10 border-b border-vw-border-softer bg-vw-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-semibold tracking-tight text-vw-fg">
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
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8 lg:pt-20">
          <div className="lg:col-span-6 lg:pt-4">
            <Reveal style={{ animationDelay: "40ms" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vw-accent">
                AI voice customer support
              </p>
            </Reveal>
            <Reveal style={{ animationDelay: "120ms" }}>
              <h1 className="mt-5 max-w-[14ch] text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-vw-fg">
                First-line support customers can actually talk to.
              </h1>
            </Reveal>
            <Reveal style={{ animationDelay: "200ms" }}>
              <p className="mt-6 max-w-[36ch] text-lg leading-relaxed text-vw-fg-soft sm:text-xl">
                Deflect common questions with a voice layer on your site: visitors tap the mic, ask in English, and hear
                answers shaped by your FAQs and tools. Your team reviews transcripts and tunes prompts in one console.
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
                Create workspace
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
              <div
                className="absolute -right-6 -top-6 hidden h-32 w-32 rounded-2xl border border-vw-accent-edge bg-vw-accent-veil sm:block lg:-right-10 lg:-top-10"
                aria-hidden
              />
              <figure className="relative overflow-hidden rounded-2xl border border-vw-border shadow-vw-lg">
                <img
                  src={HERO_IMAGE}
                  alt="Shopkeeper at counter taking a contactless payment from a customer"
                  width={800}
                  height={1000}
                  className="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-auto lg:max-h-[min(520px,70vh)]"
                  loading="eager"
                  decoding="async"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-vw-bg via-vw-bg/85 to-transparent px-5 pb-5 pt-16 text-sm leading-snug text-vw-fg-soft">
                  Same site, same checkout: voice support without forcing visitors into another app.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        <section
          className="relative z-10 border-t border-vw-border-softer bg-vw-surface/40 py-20"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="how-heading" className="text-3xl font-bold tracking-tight text-vw-fg sm:text-4xl">
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
                },
                {
                  step: "02",
                  title: "Answer with your policies",
                  body: "Speech streams over Socket.IO. Deepgram transcribes and speaks; Groq reasons and can call FAQ search, order lookup, and optional web search.",
                },
                {
                  step: "03",
                  title: "Improve like a support team",
                  body: "Read transcripts, spot repeat questions, and refine FAQs and prompts so the next visitor gets a clearer answer.",
                },
              ].map((item) => (
                <li key={item.step} className="sm:pt-2">
                  <span
                    className="text-xs font-bold tabular-nums tracking-[0.35em] text-vw-accent"
                    aria-hidden
                  >
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-vw-fg">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-vw-fg-soft">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="relative z-10 py-20" aria-labelledby="voice-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <h2 id="voice-heading" className="text-3xl font-bold tracking-tight text-vw-fg sm:text-4xl">
                  Support workflows, not just audio
                </h2>
                <p className="mt-4 text-base leading-relaxed text-vw-fg-soft">
                  English speech end-to-end. Sessions, transcripts, and top questions live in the console so you can
                  coach the agent like tier-0 support: consistent tone, searchable history, fewer repeated tickets.
                </p>
              </div>
              <ul className="flex flex-wrap gap-3 text-sm font-medium text-vw-fg" aria-label="Support highlights">
                <li className="rounded-full border border-vw-border bg-vw-elevated px-4 py-2 tracking-tight">English voice</li>
                <li className="rounded-full border border-vw-border bg-vw-elevated px-4 py-2 tracking-tight">FAQ-backed</li>
                <li className="rounded-full border border-vw-border bg-vw-elevated px-4 py-2 tracking-tight">Transcripts</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="relative z-10 border-t border-vw-border bg-vw-accent px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-vw-accent-fg sm:text-3xl">
                Ready for the next “where is my order?” moment.
              </h2>
              <p className="mt-2 max-w-xl text-vw-accent-fg/90">
                Spin up a workspace, rehearse answers in the playground, load your FAQs, then embed when the flow feels
                right for real customers.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-vw-accent-fg/30 bg-vw-bg px-6 py-3.5 text-base font-semibold text-vw-fg shadow-vw transition-[transform,background-color] duration-vw ease-out-expo hover:bg-vw-surface active:scale-[0.99]"
            >
              Start free
            </Link>
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
