import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f7f6f2",
        line: "#d8d6ce",
        accent: "#0f766e",
        coral: "#c2410c"
      },
      boxShadow: {
        soft: "0 12px 34px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
