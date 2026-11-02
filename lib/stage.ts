"use client";

import { useSyncExternalStore } from "react";

/** When the gate opened (performance.now() seconds), shared by everything that plays an intro. */
let revealAt: number | null = null;
const listeners = new Set<() => void>();

export const stage = {
  reveal(skipIntro: boolean) {
    // Reduced motion starts the reveal in the past, so intros render in their end state.
    revealAt = performance.now() / 1000 - (skipIntro ? 10 : 0);
    listeners.forEach((fn) => fn());
  },
};

export function useRevealAt() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => revealAt,
    () => null,
  );
}
