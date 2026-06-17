import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Matches naturaldisasterresponseteam.com (ndrt-website globals.css)
      colors: {
        navy: {
          DEFAULT: "#0a0f1e",
          light: "#111827",
          lighter: "#1e2a3a",
          border: "#1e2a3a",
        },
        gold: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          light: "#FBBF24",
          muted: "#FEF3C7",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

export default config
