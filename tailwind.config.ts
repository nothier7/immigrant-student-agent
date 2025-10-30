import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        heading: "rgb(var(--heading) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        primary600: "rgb(var(--primary-600) / <alpha-value>)",
        primary700: "rgb(var(--primary-700) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        highlight: "rgb(var(--highlight) / <alpha-value>)",
        gold: "rgb(var(--gold) / <alpha-value>)",
        ringBrand: "rgb(var(--ring) / <alpha-value>)",
      },
      boxShadow: {
        card: "0 8px 20px rgba(2, 6, 23, 0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
