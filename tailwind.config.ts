import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Avant-garde palette: glitch void + neon + acid + holographic.
        gofest: {
          bg: "#050507", // void
          panel: "#0c0c12", // near-black panel
          panel2: "#15151f",
          accent: "#ff2bd6", // neon magenta
          accent2: "#00f0ff", // electric cyan
          acid: "#c6ff00", // acid lime
          mewtwo: "#b026ff", // vivid purple
          bone: "#f4f1ea", // brutalist paper (inverted panels)
          ink: "#0a0a0a",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        // Neo-brutalist hard offset shadows.
        brutal: "6px 6px 0 0 rgba(0,0,0,0.85)",
        brutalMagenta: "7px 7px 0 0 rgba(255,43,214,0.85)",
        brutalCyan: "7px 7px 0 0 rgba(0,240,255,0.85)",
        brutalAcid: "6px 6px 0 0 rgba(198,255,0,0.9)",
      },
    },
  },
  plugins: [],
};

export default config;
