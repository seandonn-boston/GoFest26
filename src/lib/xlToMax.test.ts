import { describe, expect, it } from "vitest";
import { xlToMaxRemaining } from "./xlToMax";

describe("xlToMaxRemaining", () => {
  it("subtracts held XL from the full 40->50 cost per variant", () => {
    // 200 XL held at level 40: 296/360/272 minus 200.
    expect(xlToMaxRemaining(40, 200)).toEqual({ standard: 96, shadow: 160, purified: 72 });
  });

  it("scales by the 40->50 band for partial levels", () => {
    expect(xlToMaxRemaining(45, 0)).toEqual({ standard: 148, shadow: 180, purified: 136 });
  });

  it("is zero at level 50 or when you already have enough", () => {
    expect(xlToMaxRemaining(50, 0)).toEqual({ standard: 0, shadow: 0, purified: 0 });
    expect(xlToMaxRemaining(40, 999).standard).toBe(0);
  });
});
