import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount anything rendered between tests. A no-op for node-env tests (nothing
// is ever mounted there), so this setup is safe to apply suite-wide.
afterEach(() => {
  cleanup();
});
