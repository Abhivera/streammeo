/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
          bg: "oklch(0.145 0.012 74)",
          surface: "oklch(0.195 0.014 74)",
          elevated: "oklch(0.238 0.016 74)",
          border: "oklch(0.375 0.021 74)",
          "border-faint": "oklch(0.315 0.018 74)",
          "border-softer": "oklch(0.295 0.017 74)",
          muted: "oklch(0.645 0.016 74)",
          placeholder: "oklch(0.56 0.019 74)",
          fg: "oklch(0.975 0.005 74)",
          "fg-soft": "oklch(0.805 0.011 74)",
          accent: "oklch(0.765 0.1 62)",
          "accent-hover": "oklch(0.825 0.095 62)",
          "accent-fg": "oklch(0.185 0.038 62)",
          "accent-surface": "oklch(0.29 0.055 66)",
          "accent-veil": "oklch(0.26 0.055 64)",
          "accent-ring": "oklch(0.52 0.09 64)",
          "accent-edge": "oklch(0.48 0.08 64)",
          "accent-strong": "oklch(0.62 0.095 64)",
          danger: "oklch(0.595 0.165 22)",
          "danger-soft": "oklch(0.81 0.06 22)",
          "danger-edge": "oklch(0.48 0.12 22)",
          "danger-input": "oklch(0.42 0.1 22)",
          success: "oklch(0.695 0.095 158)",
          "success-soft": "oklch(0.255 0.042 158)",
          "success-fg": "oklch(0.905 0.055 158)",
          "success-edge": "oklch(0.52 0.09 158)",
          "table-tint": "oklch(0.175 0.013 74)",
          "elevated-hover": "oklch(0.268 0.018 74)",
          "embed-preview": "oklch(0.935 0.012 78)",
          /** In-app “host page” behind the widget; softer than embed-preview to reduce glare against dark chrome */
          "embed-preview-muted": "oklch(0.78 0.011 76)",
          warning: "oklch(0.78 0.1 72)",
          "warning-soft": "oklch(0.265 0.055 72)",
          "warning-edge": "oklch(0.5 0.088 72)",
        },
      },
      boxShadow: {
        vw: "0 1px 2px oklch(0.1 0.018 74 / 0.42)",
        "vw-lg": "0 12px 40px oklch(0.08 0.016 74 / 0.32)",
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
