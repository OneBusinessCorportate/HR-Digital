import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OneBusiness green palette
        brand: {
          50: "#eefbf3",
          100: "#d6f5e0",
          200: "#b0e9c5",
          300: "#7dd6a3",
          400: "#47bd7c",
          500: "#22a25f",
          600: "#15834b",
          700: "#12683e",
          800: "#125334",
          900: "#10442c",
          950: "#062617",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
