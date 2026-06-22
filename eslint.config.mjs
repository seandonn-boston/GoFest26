import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// Flat config for ESLint 9. `next lint` was removed in Next 16, so we run the
// ESLint CLI directly (see the "lint" script) against the Next-recommended rule
// sets shipped by eslint-config-next.
export default [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts", "**/*.config.{js,mjs,ts}"],
  },
  {
    // This is hand-written React (no React Compiler). These two rules, newly
    // promoted to errors in eslint-config-next 16, target compiler output and
    // fire on standard, correct patterns here — SSR-hydration flags, matchMedia
    // listeners, prop→state syncing, and imperative WebGL/dialog ref setup — so
    // they're noise rather than signal. The rest of the Next ruleset stays on.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
];
