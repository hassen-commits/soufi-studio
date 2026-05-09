import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1a1a2e",
          50: "#e9eaf0",
          100: "#c2c5d4",
          200: "#9ba0b8",
          300: "#747b9c",
          400: "#4d5680",
          500: "#262e64",
          600: "#1f2654",
          700: "#1a1a2e",
          800: "#121224",
          900: "#08081a",
        },
        gold: {
          DEFAULT: "#c9a96e",
          light: "#c9a84c",
          dark: "#a88a4f",
        },
        parchment: "#f6f1e7",
      },
      fontFamily: {
        title: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        body: ["var(--font-lato)", "Lato", "sans-serif"],
        arabic: ["var(--font-amiri)", "Amiri", "serif"],
      },
      fontSize: {
        "citation-sm": ["1.125rem", { lineHeight: "1.7", letterSpacing: "0.005em" }],
        citation: ["1.375rem", { lineHeight: "1.65", letterSpacing: "0.005em" }],
        "citation-lg": ["1.875rem", { lineHeight: "1.55" }],
      },
      maxWidth: {
        prose: "65ch",
        narrow: "42rem",
      },
      typography: ({ theme }: { theme: (k: string) => string }) => ({
        soufi: {
          css: {
            "--tw-prose-body": theme("colors.navy.700"),
            "--tw-prose-headings": theme("colors.navy.700"),
            "--tw-prose-links": theme("colors.gold.dark"),
            "--tw-prose-quotes": theme("colors.gold.light"),
            fontFamily: theme("fontFamily.body"),
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
