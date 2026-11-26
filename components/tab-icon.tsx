"use client";

import { useEffect } from "react";

const AWAY = "/tab/chrysalis-v1.png";

/**
 * The tab icon tells a small story: on the site it is the violet butterfly (app/icon.png);
 * switch to another tab and it folds back into its chrysalis, then emerges again when you
 * return. The behaviour follows Astro's site, which swaps its favicon on visibilitychange.
 */
export function TabIcon() {
  useEffect(() => {
    const links = () => [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];
    // Remember each icon's own href, and warm the away image so the swap is instant.
    for (const l of links()) l.dataset.on ??= l.href;
    const warm = new Image();
    warm.src = AWAY;
    const swap = () => {
      for (const l of links()) {
        l.dataset.on ??= l.href;
        l.href = document.hidden ? AWAY : l.dataset.on;
      }
    };
    document.addEventListener("visibilitychange", swap);
    return () => document.removeEventListener("visibilitychange", swap);
  }, []);
  return null;
}
