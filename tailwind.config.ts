import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: "color-mix(in srgb, var(--bg-primary) calc(<alpha-value> * 100%), transparent)",
        surface: "color-mix(in srgb, var(--bg-surface) calc(<alpha-value> * 100%), transparent)",
        line: "color-mix(in srgb, var(--border) calc(<alpha-value> * 100%), transparent)",
        ink: "color-mix(in srgb, var(--text-primary) calc(<alpha-value> * 100%), transparent)",
        muted: "color-mix(in srgb, var(--text-secondary) calc(<alpha-value> * 100%), transparent)",
        accent: "color-mix(in srgb, var(--accent-primary) calc(<alpha-value> * 100%), transparent)",
        "accent-hover": "color-mix(in srgb, var(--accent-hover) calc(<alpha-value> * 100%), transparent)",
      },
      fontFamily: {
        arabic: ["color-mix(in srgb, var(--font-amiri) calc(<alpha-value> * 100%), transparent)", "serif"],
        ruqaa: ["color-mix(in srgb, var(--font-ruqaa) calc(<alpha-value> * 100%), transparent)", "serif"],
        serif: ["color-mix(in srgb, var(--font-serif) calc(<alpha-value> * 100%), transparent)", "Georgia", "serif"],
        sans: ["color-mix(in srgb, var(--font-sans) calc(<alpha-value> * 100%), transparent)", "system-ui", "sans-serif"],
      },
    },
  },
} satisfies Config;
