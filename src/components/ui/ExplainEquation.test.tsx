// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ExplainEquation } from "./ExplainEquation";
import { EditableNumber } from "./EditableNumber";
import { explainCurrency } from "@/domain";
import { getBoss } from "@/data";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { BossInput } from "@/domain";

afterEach(() => usePlannerStore.getState().resetAll());

const inp = (over: Partial<BossInput["current"]> = {}): BossInput => ({
  bossId: "zekrom",
  selected: true,
  counts: { standard: 1, shadow: 0, purified: 0 },
  current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 40, megaLevel: 0, ...over },
  target: { level: 50, megaLevel: 4 },
});

describe("<EditableNumber>", () => {
  it("commits a clamped, rounded value on Enter", () => {
    let committed = -1;
    render(<EditableNumber value={42} min={0} max={50} onCommit={(v) => (committed = v)} />);
    fireEvent.click(screen.getByRole("button"));
    const field = screen.getByRole("spinbutton");
    act(() => fireEvent.change(field, { target: { value: "999" } }));
    act(() => fireEvent.keyDown(field, { key: "Enter" }));
    expect(committed).toBe(50); // clamped to max
  });
});

describe("<ExplainEquation>", () => {
  it("writes an edited source value back through the card's store setter", () => {
    const boss = getBoss("zekrom")!;
    // seed the store so the setter has an input to update
    usePlannerStore.getState().toggleSelected("zekrom");
    const ex = explainCurrency(boss, inp(), "xlCandy", {}, 3)!;

    render(<ExplainEquation bossId="zekrom" explanation={ex} />);

    // The "current XL on hand" line exposes an editable 0 → set it to 100.
    // Find the editable bound to current.xlCandy by its initial value text.
    const editButtons = screen.getAllByRole("button");
    // The on-hand XL edit starts at 0; click it, type 100, commit.
    const zero = editButtons.find((b) => b.textContent === "0")!;
    fireEvent.click(zero);
    const field = screen.getByRole("spinbutton");
    act(() => fireEvent.change(field, { target: { value: "100" } }));
    act(() => fireEvent.keyDown(field, { key: "Enter" }));

    expect(usePlannerStore.getState().inputs.zekrom.current.xlCandy).toBe(100);
  });
});
