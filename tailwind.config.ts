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
      // Bump every text utility ~20% for legibility (users found the small type
      // too small). Each [size, lineHeight] is the Tailwind default × 1.2.
      // Intentionally NOT scaled, so they keep their designed size:
      //   • text-7xl — only the masthead H1 uses it (the "main title" exemption)
      //   • text-2xl — the card species name (CyberTitle) is pinned to text-[24px]
      // Arbitrary text-[Npx] sizes are bumped in place; text-[2.6rem] (the H1's
      // base size) and Mewtwo's inline 2.75rem wordmark are likewise left alone.
      fontSize: {
        xs: ["0.9rem", { lineHeight: "1.2rem" }],
        sm: ["1.05rem", { lineHeight: "1.5rem" }],
        base: ["1.2rem", { lineHeight: "1.8rem" }],
        lg: ["1.35rem", { lineHeight: "2.1rem" }],
        xl: ["1.5rem", { lineHeight: "2.1rem" }],
        "2xl": ["1.8rem", { lineHeight: "2.4rem" }],
        "3xl": ["2.25rem", { lineHeight: "2.7rem" }],
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
