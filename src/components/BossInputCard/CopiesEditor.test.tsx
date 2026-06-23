// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CopiesEditor } from "./CopiesEditor";
import { usePlannerStore } from "@/store/usePlannerStore";
import { getBoss } from "@/data";

afterEach(() => usePlannerStore.getState().resetAll());

// Reads the live input from the store, like BossInputCard does, so store actions
// fired inside the editor re-render it.
function Harness() {
  const input = usePlannerStore((s) => s.inputs.zekrom);
  if (!input) return null;
  return <CopiesEditor boss={getBoss("zekrom")!} input={input} />;
}

const seedTwoCopies = () => {
  const s = usePlannerStore.getState();
  s.toggleSelected("zekrom");
  s.addCopy("zekrom"); // seeds #1 from current + appends #2 → 2 individuals
};

describe("<CopiesEditor>", () => {
  it("lists each individual and its remaining need from the shared pool", () => {
    seedTwoCopies();
    render(<Harness />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    // Default copies: L40→50 regular = 296 XL each, no on-hand → each still needs it.
    expect(screen.getAllByText(/still needs XL 296/).length).toBeGreaterThanOrEqual(2);
  });

  it("adds another individual on click", () => {
    seedTwoCopies();
    render(<Harness />);
    fireEvent.click(screen.getByText(/Add another individual/));
    expect(usePlannerStore.getState().inputs.zekrom.copies).toHaveLength(3);
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("cascades the shared on-hand XL to the #1 individual first", () => {
    seedTwoCopies();
    usePlannerStore.getState().setCurrent("zekrom", "xlCandy", 200); // shared pool
    render(<Harness />);
    // #1 absorbs 200 of its 296 → needs 96; #2 keeps the full 296.
    expect(screen.getByText(/still needs XL 96/)).toBeInTheDocument();
    expect(screen.getByText(/still needs XL 296/)).toBeInTheDocument();
  });

  it("removes back to one and collapses (copies cleared)", () => {
    seedTwoCopies();
    render(<Harness />);
    const rows = screen.getAllByLabelText("Remove individual");
    fireEvent.click(rows[1]);
    expect(usePlannerStore.getState().inputs.zekrom.copies).toBeUndefined();
  });
});
