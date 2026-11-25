"use client";

import { frame } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
 * One scroll scheduler for everything that reads the layout as the page scrolls. Readers run once
 * per frame in Motion's preRender step: after smooth scroll has moved the page (update) and before
 * Motion and the readers' own deferred writes touch the DOM (render), so their reads never force
 * a layout. A reader that writes should defer the write with frame.render().
 */
const readers = new Set<() => void>();
let queued = false;
const run = () => {
  queued = false;
  readers.forEach((r) => r());
};
const schedule = () => {
  if (queued) return;
  queued = true;
  frame.preRender(run);
};

/** Runs `read` once per frame while the page scrolls or resizes (and once now). Returns an unsubscribe. */
export function onScrollFrame(read: () => void) {
  if (!readers.size) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
  }
  readers.add(read);
  schedule();
  return () => {
    readers.delete(read);
    if (!readers.size) {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    }
  };
}

/**
 * The page takes the theme of whichever section crosses the middle of the
 * viewport. Sections opt in with data-theme="ink" | "graphite" | "paper";
 * the colours ease between themes in CSS (registered custom properties).
 */
export function ThemeWatcher() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    return onScrollFrame(() => {
      const mid = window.innerHeight * 0.5;
      let theme = "ink";
      for (const el of document.querySelectorAll<HTMLElement>("[data-theme]")) {
        if (el === root) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) theme = el.dataset.theme ?? "ink";
      }
      if (root.dataset.theme !== theme) frame.render(() => (root.dataset.theme = theme));
    });
  }, [pathname]);
  return null;
}
