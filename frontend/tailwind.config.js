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
          /** Dark SaaS — bg #0F0F10, card #18181B, accent #FF1E2D, text #FFFFFF */
          sidebar: "#141416",
          bg: "#0F0F10",
          surface: "#18181B",
          "table-head": "#1F1F23",
          navActive: "rgba(255, 30, 45, 0.12)",

          accent: "#FF1E2D",
          headline: "#FFFFFF",
          fg: "#FFFFFF",
          muted: "#A1A1AA",
          "fg-soft": "#D4D4D8",

          elevated: "#27272A",
          keywell: "#141416",
          border: "#3F3F46",
          "border-faint": "#35353B",
          "border-softer": "#27272A",

          placeholder: "rgba(161, 161, 170, 0.55)",

          "progress-track": "#27272A",
          "progress-fill": "#FF1E2D",

          "badge-open-bg": "#27272A",
          "badge-open-text": "#A1A1AA",

          "accent-hover": "#FF4A57",
          "accent-fg": "#FFFFFF",
          "accent-surface": "rgba(255, 30, 45, 0.14)",
          "accent-veil": "rgba(255, 30, 45, 0.08)",
          "accent-ring": "rgba(255, 30, 45, 0.45)",
          "accent-edge": "#CC1825",
          "accent-strong": "#FF6B76",

          danger: "#F87171",
          "danger-soft": "rgba(248, 113, 113, 0.12)",
          "danger-edge": "#EF4444",
          "danger-input": "rgba(248, 113, 113, 0.35)",

          success: "#4ADE80",
          "success-soft": "rgba(74, 222, 128, 0.14)",
          "success-fg": "#ECFDF5",
          "success-edge": "#22C55E",

          "elevated-hover": "#323238",

          "embed-preview": "#18181B",
          "embed-preview-muted": "#141416",
          "embed-body": "#FFFFFF",

          warning: "#FACC15",
          "warning-soft": "rgba(250, 204, 21, 0.14)",
          "warning-edge": "#EAB308",
        },
      },
      boxShadow: {
        vw: "0 1px 2px rgba(0, 0, 0, 0.35)",
        "vw-lg": "0 12px 40px rgba(0, 0, 0, 0.45)",
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
