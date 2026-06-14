import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { HeroMockup } from "./HeroMockup";
import { SiteFooter } from "./SiteFooter";

type MarketingShellProps = {
  children?: ReactNode;
  showHero?: boolean;
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  heroPrimaryCta?: { label: string; to: string };
  heroSecondaryCta?: { label: string; to: string };
  heroFooterLink?: { label: string; to: string; text: string };
};

export function MarketingShell({
  children,
  showHero = false,
  heroEyebrow = "B2B customer service & ticketing",
  heroTitle = "One support desk for email, chat, and every customer conversation",
  heroDescription = "Streammeo helps SaaS teams resolve issues faster with a unified queue, SLA tracking, AI-drafted replies, and real-time agent collaboration.",
  heroPrimaryCta = { label: "Start free trial", to: "/register" },
  heroSecondaryCta,
  heroFooterLink,
}: MarketingShellProps): ReactElement {
  return (
    <div className="vw-marketing-shell min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0 transition-opacity duration-vw hover:opacity-90">
          <BrandLogo variant="full" fit="chrome" chromeSize="nav" />
        </Link>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
          <Link to="/login" className="vw-btn-secondary flex-1 px-3 py-2 text-sm sm:flex-none sm:px-4">
            Sign in
          </Link>
          <Link to="/register" className="vw-btn-primary flex-1 px-3 py-2 text-sm sm:flex-none sm:px-4">
            <span className="sm:hidden">Try free</span>
            <span className="hidden sm:inline">Start free trial</span>
          </Link>
        </div>
      </header>

      {showHero ? (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-landing-in opacity-0">
              <p className="vw-eyebrow">{heroEyebrow}</p>
              <h1 className="vw-hero-title mt-4">{heroTitle}</h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-vw-muted sm:text-lg">
                {heroDescription}
              </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link to={heroPrimaryCta.to} className="vw-btn-primary px-6 py-3 text-center text-base">
              {heroPrimaryCta.label}
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {heroSecondaryCta ? (
              <Link
                to={heroSecondaryCta.to}
                className="text-sm font-medium text-vw-accent underline decoration-vw-accent/60 underline-offset-4 transition-colors duration-vw hover:text-vw-accent-hover hover:decoration-vw-accent"
              >
                {heroSecondaryCta.label}
              </Link>
            ) : null}
            <Link
              to="/help"
              className="text-sm font-medium text-vw-muted underline decoration-vw-border underline-offset-4 transition-colors hover:text-vw-fg"
            >
              Customer help
            </Link>
            <Link
              to="/docs"
              className="text-sm font-medium text-vw-muted underline decoration-vw-border underline-offset-4 transition-colors hover:text-vw-fg"
            >
              Read the docs
            </Link>
            </div>
          </div>
              {heroFooterLink ? (
                <p className="mt-6 text-sm text-vw-muted">
                  {heroFooterLink.text}{" "}
                  <Link
                    to={heroFooterLink.to}
                    className="font-medium text-vw-accent underline decoration-vw-accent/60 underline-offset-4 hover:text-vw-accent-hover"
                  >
                    {heroFooterLink.label}
                  </Link>
                </p>
              ) : null}
            </div>
            <HeroMockup className="lg:justify-self-end" />
          </div>
        </section>
      ) : null}

      {children}

      <SiteFooter />
    </div>
  );
}

type AuthMarketingLayoutProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

const AUTH_FEATURES = [
  "Unified ticket queue for email and chat",
  "SLA tracking with breach alerts",
  "AI-drafted replies your team reviews",
] as const;

export function AuthMarketingLayout({
  title,
  description,
  footer,
  children,
}: AuthMarketingLayoutProps): ReactElement {
  return (
    <div className="vw-marketing-shell min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="vw-auth-hero relative hidden flex-col justify-between overflow-hidden px-8 py-10 lg:flex xl:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,30,45,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-vw-accent/10 blur-3xl" />

        <Link to="/" className="relative z-10 w-fit transition-opacity duration-vw hover:opacity-90">
          <BrandLogo variant="full" fit="chrome" chromeSize="nav" />
        </Link>

        <div className="relative z-10 max-w-lg">
          <p className="vw-eyebrow">Agent console</p>
          <h1 className="vw-hero-title mt-4 text-3xl sm:text-4xl xl:text-[2.75rem]">
            Your team&apos;s support desk, ready in minutes
          </h1>
          <p className="mt-5 text-base leading-relaxed text-vw-muted">
            Email, live chat, SLAs, and AI-drafted replies — everything from first contact to
            resolution.
          </p>
          <ul className="mt-8 space-y-3">
            {AUTH_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-vw-fg-soft">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vw-accent/15 text-vw-accent">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <HeroMockup className="relative z-10 mt-8 max-w-md" />
      </div>

      <div className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-8 lg:min-h-0 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[28rem] animate-landing-in opacity-0">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="inline-block transition-opacity hover:opacity-90">
              <BrandLogo variant="full" className="h-12 w-auto" />
            </Link>
            <Link
              to="/"
              className="text-xs font-medium text-vw-muted transition-colors hover:text-vw-fg"
            >
              Back to home
            </Link>
          </div>

          <div className="mb-8">
            <p className="vw-eyebrow lg:hidden">Agent console</p>
            <h2 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-vw-headline sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-vw-muted">{description}</p>
            {footer}
          </div>

          {children}

          <p className="mt-8 text-center text-xs text-vw-muted">
            Secured sign-in · SOC 2-ready infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}
