import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // GO Fest-y palette
        gofest: {
          bg: "#0b1020",
          panel: "#141b33",
          panel2: "#1c2545",
          accent: "#7c5cff",
          accent2: "#22d3ee",
          mewtwo: "#a855f7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
