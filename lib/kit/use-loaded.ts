"use client";

import { useSyncExternalStore } from "react";
import { onReady } from "@/components/loader";

/** True once the entry curtain has started lifting (html[data-loaded]). */
export function useLoaded() {
  return useSyncExternalStore(
    (notify) => onReady(notify),
    () => document.documentElement.hasAttribute("data-loaded"),
    () => false,
  );
}
