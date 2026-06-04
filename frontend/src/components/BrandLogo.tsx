import type { ReactElement } from "react";

const fullDefault =
  "h-[11rem] w-auto max-w-[min(100%,36rem)] sm:h-48";
const iconDefault = "h-40 w-40 sm:h-44 sm:w-44";

const fullChromeNav =
  "absolute left-0 top-1/2 h-12 w-auto max-w-none origin-left -translate-y-1/2 scale-[4] sm:h-14 sm:scale-[4]";
const fullChromeFooter =
  "absolute left-0 top-1/2 h-10 w-auto max-w-none origin-left -translate-y-1/2 scale-[2] sm:h-11 sm:scale-[2]";
const iconChrome =
  "absolute left-0 top-1/2 h-10 w-10 origin-left -translate-y-1/2 scale-[4] sm:h-11 sm:w-11 sm:scale-[4]";

export function BrandLogo({
  variant = "full",
  className = "",
  fit = "default",
  chromeSize = "nav",
}: Readonly<{
  variant?: "full" | "icon";
  className?: string;
  /** Large logo in a compact row — does not grow nav/footer height. */
  fit?: "default" | "chrome";
  /** `footer` uses a smaller scale and wider slot to avoid overlapping nearby text. */
  chromeSize?: "nav" | "footer";
}>): ReactElement {
  const imgClass =
    variant === "full"
      ? fit === "chrome"
        ? chromeSize === "footer"
          ? fullChromeFooter
          : fullChromeNav
        : fullDefault
      : fit === "chrome"
        ? iconChrome
        : iconDefault;

  const img = (
    <img
      src={variant === "full" ? "/streammeo-logo-name.png" : "/streammeo-logo.png"}
      alt={fit === "chrome" ? "" : "Streammeo"}
      aria-hidden={fit === "chrome" ? true : undefined}
      className={`shrink-0 object-contain object-left ${imgClass} ${className}`}
      decoding="async"
    />
  );

  if (fit === "chrome") {
    const slot =
      variant === "full"
        ? chromeSize === "footer"
          ? "relative inline-block h-10 w-44 shrink-0 sm:w-52"
          : "relative inline-block h-10 w-36 shrink-0 overflow-visible sm:w-40"
        : "relative inline-block h-10 w-10 shrink-0 overflow-visible";
    return (
      <span className={slot} role="img" aria-label="Streammeo">
        {img}
      </span>
    );
  }

  return img;
}
