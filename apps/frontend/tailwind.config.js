import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/index.css"),
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        brand: [
          '"Bricolage Grotesque"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      keyframes: {
        "landing-in": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "landing-in":
          "landing-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      colors: {
        vw: {
          /** Layer stack — aligned with playground-widget-host.html mint preview */
          sidebar: "#e8faf4",
          bg: "#d4f0e6",
          surface: "#ffffff",
          /** Table header strip, inset wells */
          "table-head": "#e8faf4",
          /** Active nav row (avoid `*-nav-active` in class names; Tailwind misparses vs `active:`) */
          navActive: "#c5e9da",

          accent: "#1d9e75",
          headline: "#041a12",
          /** Stat numbers, table body, primary readable copy */
          fg: "#0c3226",
          muted: "#0f6e56",
          /** Secondary copy (between fg and muted) */
          "fg-soft": "#145a45",

          /** Unified chrome */
          elevated: "#f4fbf8",
          keywell: "#ecf6f1",
          border: "#b0d8c4",
          "border-faint": "#c5e3d6",
          "border-softer": "#d9efe5",

          placeholder: "rgba(15, 110, 86, 0.42)",

          "progress-track": "#c5e9da",
          "progress-fill": "#1d9e75",

          "badge-open-bg": "#e8faf4",
          "badge-open-text": "#0f6e56",

          "accent-hover": "#26b384",
          "accent-fg": "#ffffff",
          "accent-surface": "rgba(29, 158, 117, 0.12)",
          "accent-veil": "rgba(29, 158, 117, 0.08)",
          "accent-ring": "#45d4a4",
          "accent-edge": "#178564",
          "accent-strong": "#2bbf8f",

          danger: "#d64545",
          "danger-soft": "rgba(214, 69, 69, 0.1)",
          "danger-edge": "#b83232",
          "danger-input": "rgba(214, 69, 69, 0.28)",

          success: "#1d9e75",
          "success-soft": "rgba(29, 158, 117, 0.14)",
          "success-fg": "#041a12",
          "success-edge": "#178564",

          "elevated-hover": "#e8f4ee",

          "embed-preview": "#e8faf4",
          "embed-preview-muted": "#d4f0e6",
          "embed-body": "#0c3226",

          warning: "#c9a227",
          "warning-soft": "rgba(232, 197, 71, 0.22)",
          "warning-edge": "#a88620",
        },
      },
      boxShadow: {
        vw: "0 1px 2px rgba(4, 26, 18, 0.06)",
        "vw-lg": "0 12px 40px rgba(4, 26, 18, 0.1)",
      },
      transitionDuration: {
        vw: "180ms",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
