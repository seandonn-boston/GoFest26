// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MewtwoCopiesEditor } from "./MewtwoCopiesEditor";
import { usePlannerStore } from "@/store/usePlannerStore";

afterEach(() => usePlannerStore.getState().resetAll());

const seed = () => {
  const s = usePlannerStore.getState();
  s.toggleSelected("mega-mewtwo-x");
  s.toggleSelected("mega-mewtwo-y");
  s.addMewtwoCopy(); // seeds #1 + appends #2 → two Mewtwo
};

describe("<MewtwoCopiesEditor>", () => {
  it("lists each Mewtwo with independent X and Y mega inputs", () => {
    seed();
    render(<MewtwoCopiesEditor />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    // Independent branches exposed per row.
    expect(screen.getAllByText("X mega").length).toBe(2);
    expect(screen.getAllByText("Y mega").length).toBe(2);
  });

  it("adds another Mewtwo on click", () => {
    seed();
    render(<MewtwoCopiesEditor />);
    fireEvent.click(screen.getByText(/Add another Mewtwo/));
    expect(usePlannerStore.getState().inputs["mega-mewtwo-x"].copies).toHaveLength(3);
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("removing back to one collapses the editor (copies cleared)", () => {
    seed();
    render(<MewtwoCopiesEditor />);
    fireEvent.click(screen.getAllByLabelText("Remove Mewtwo")[1]);
    expect(usePlannerStore.getState().inputs["mega-mewtwo-x"].copies).toBeUndefined();
  });
});
