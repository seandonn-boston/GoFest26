// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CalibrationPanel } from "./CalibrationPanel";
import { usePlannerStore } from "@/store/usePlannerStore";

afterEach(() => usePlannerStore.getState().resetAll());

describe("<CalibrationPanel>", () => {
  it("writes a typed per-raid observation into the store", () => {
    render(<CalibrationPanel />);
    // Expand the collapsed panel, then log a Super Mega energy observation.
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByLabelText(/Observed Mega Energy \/ Super Mega raid/i);
    // Wrapped in act: the change drives a zustand store update → controlled re-render.
    act(() => {
      fireEvent.change(input, { target: { value: "430" } });
    });
    expect(usePlannerStore.getState().settings.calibration.superMegaEnergy).toBe(430);
  });

  it("clears the calibration when the field is emptied", () => {
    usePlannerStore.getState().setCalibration("superMegaEnergy", 430);
    render(<CalibrationPanel />);
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByLabelText(/Observed Mega Energy \/ Super Mega raid/i);
    act(() => {
      fireEvent.change(input, { target: { value: "" } });
    });
    expect(usePlannerStore.getState().settings.calibration.superMegaEnergy).toBeUndefined();
  });
});
