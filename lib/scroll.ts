/**
 * The page's scroll position, taken in the scroll event, which runs before any frame's writes.
 * Frame loops read it here instead of window.scrollY, which forces a layout once other loops
 * have written styles in the same frame.
 */
let top = typeof window === "undefined" ? 0 : window.scrollY;

if (typeof window !== "undefined") {
  window.addEventListener(
    "scroll",
    () => {
      top = window.scrollY;
    },
    { passive: true },
  );
}

export const scrollTop = () => top;
