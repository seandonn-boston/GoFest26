import { describe, expect, it } from "vitest";
import { sanitizeBlock, sanitizeLine } from "./sanitizeFeedback";

describe("feedback sanitizers", () => {
  it("strips zero-width and bidi-override characters used to hide instructions", () => {
    expect(sanitizeLine("hello\u200B \u202Eworld\u200D", 100)).toBe("hello world");
    expect(sanitizeBlock("a\u2060b\nc\uFEFFd", 100)).toBe("ab\ncd");
    expect(sanitizeBlock("ignore\u2066 hidden\u2069", 100)).toBe("ignore hidden");
  });

  it("strips control characters (ANSI escape) but keeps newlines and tabs", () => {
    expect(sanitizeBlock("line1\r\nline2\u001B[31m", 100)).toBe("line1\nline2[31m");
    expect(sanitizeBlock("tab\tkept", 100)).toBe("tab\tkept");
  });

  it("flattens a line to single-spaced text", () => {
    expect(sanitizeLine("  multi\n line \t summary  ", 100)).toBe("multi line summary");
  });

  it("caps length", () => {
    expect(sanitizeLine("x".repeat(50), 10)).toHaveLength(10);
    expect(sanitizeBlock("y".repeat(50), 10)).toHaveLength(10);
  });

  it("leaves ordinary markdown alone — GitHub renders it inertly", () => {
    expect(sanitizeBlock("**bold** `code`\n- list", 100)).toBe("**bold** `code`\n- list");
  });
});
