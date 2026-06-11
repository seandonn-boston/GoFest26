/**
 * Viewport scroll lock that holds up on iOS Safari (where `overflow: hidden`
 * on body is ignored for touch scrolling): the body is pinned with
 * `position: fixed` at the current scroll offset, and the offset is restored
 * on release. Re-entrant — nested locks (loader + lightbox) release in any
 * order and scrolling resumes only when the last one is gone.
 */
let locks = 0;
let savedY = 0;

export function lockBodyScroll(): () => void {
  if (typeof window === "undefined") return () => {};
  if (++locks === 1) {
    savedY = window.scrollY;
    const b = document.body.style;
    b.position = "fixed";
    b.top = `-${savedY}px`;
    b.left = "0";
    b.right = "0";
    b.width = "100%";
    b.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      const b = document.body.style;
      b.position = "";
      b.top = "";
      b.left = "";
      b.right = "";
      b.width = "";
      b.overflow = "";
      window.scrollTo(0, savedY);
    }
  };
}
