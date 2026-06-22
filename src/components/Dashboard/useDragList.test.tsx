// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useDragList } from "./useDragList";

// A row whose hit-box is the vertical band [top, bottom] — onMove uses these to
// decide which row the pointer is over.
const rowEl = (top: number, bottom: number) =>
  ({ getBoundingClientRect: () => ({ top, bottom }) }) as unknown as HTMLElement;

const POINTER_DOWN = {
  preventDefault() {},
  pointerId: 1,
  target: { setPointerCapture() {} },
} as unknown as ReactPointerEvent;

describe("useDragList", () => {
  it("tolerates an unstable committed reference without looping", () => {
    const onReorder = vi.fn();
    // A fresh array literal every render — would spin the sync effect forever
    // before the value-compare guard. If it regresses, this test times out.
    const { result, rerender } = renderHook(() => useDragList(["a", "b", "c"], onReorder));
    rerender();
    rerender();
    expect(result.current.list).toEqual(["a", "b", "c"]);
  });

  it("reorders via Arrow Down / Arrow Up on a focused grip", () => {
    const onReorder = vi.fn();
    const committed = ["a", "b", "c"];
    const { result } = renderHook(() => useDragList(committed, onReorder));

    const press = (key: string) => {
      const e = { key, preventDefault: vi.fn() } as unknown as ReactKeyboardEvent;
      act(() => result.current.gripProps("b", "B").onKeyDown(e));
      return e;
    };

    // Arrow keys compute from the committed order (unchanged here — onReorder is a spy).
    press("ArrowDown"); // b swaps past c
    expect(onReorder).toHaveBeenLastCalledWith(["a", "c", "b"]);

    press("ArrowUp"); // b swaps up past a
    expect(onReorder).toHaveBeenLastCalledWith(["b", "a", "c"]);
  });

  it("ignores Arrow Up on the first row (nothing above it)", () => {
    const onReorder = vi.fn();
    const committed = ["a", "b", "c"];
    const { result } = renderHook(() => useDragList(committed, onReorder));
    const e = { key: "ArrowUp", preventDefault: vi.fn() } as unknown as ReactKeyboardEvent;
    act(() => result.current.gripProps("a", "A").onKeyDown(e));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("reorders by dragging a row down past another (pointer)", () => {
    const onReorder = vi.fn();
    const committed = ["a", "b", "c"];
    const { result } = renderHook(() => useDragList(committed, onReorder));

    act(() => {
      result.current.setRow("a", rowEl(0, 10));
      result.current.setRow("b", rowEl(10, 20));
      result.current.setRow("c", rowEl(20, 30));
    });

    act(() => result.current.gripProps("a", "A").onPointerDown(POINTER_DOWN)); // grab "a"
    act(() => result.current.containerProps.onPointerMove({ clientY: 25 } as ReactPointerEvent)); // over "c"
    act(() => result.current.containerProps.onPointerUp()); // drop

    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a"]);
  });

  it("does not commit a reorder when the pointer never leaves the grabbed row", () => {
    const onReorder = vi.fn();
    const committed = ["a", "b", "c"];
    const { result } = renderHook(() => useDragList(committed, onReorder));
    act(() => {
      result.current.setRow("a", rowEl(0, 10));
      result.current.setRow("b", rowEl(10, 20));
    });
    act(() => result.current.gripProps("a", "A").onPointerDown(POINTER_DOWN));
    act(() => result.current.containerProps.onPointerMove({ clientY: 5 } as ReactPointerEvent)); // still over "a"
    act(() => result.current.containerProps.onPointerUp());
    expect(onReorder).toHaveBeenCalledWith(["a", "b", "c"]); // order unchanged
  });
});
