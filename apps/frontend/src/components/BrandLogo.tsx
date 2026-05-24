import type { ReactElement } from "react";

export function BrandLogo({
  variant = "full",
  className = "",
}: Readonly<{
  variant?: "full" | "icon";
  className?: string;
}>): ReactElement {
  const src = variant === "full" ? "/streammeo-logo-name.png" : "/streammeo-logo.png";
  return (
    <img
      src={src}
      alt="Streammeo"
      className={`shrink-0 object-contain object-left ${variant === "full" ? "h-9 w-auto max-w-[min(100%,14rem)] sm:h-10" : "h-8 w-8 sm:h-9 sm:w-9"} ${className}`}
      decoding="async"
    />
  );
}
