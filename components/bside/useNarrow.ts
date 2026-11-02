"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 800px)";

function subscribe(fn: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
}

/** True on the single-column layout (the same 800px breakpoint as the CSS). False on the server. */
export function useNarrow() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
