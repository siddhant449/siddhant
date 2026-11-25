"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * The page takes the theme of whichever section crosses the middle of the
 * viewport. Sections opt in with data-theme="ink" | "graphite" | "paper";
 * the colours ease between themes in CSS (registered custom properties).
 */
export function ThemeWatcher() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let theme = "ink";
      for (const el of document.querySelectorAll<HTMLElement>("[data-theme]")) {
        if (el === root) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) theme = el.dataset.theme ?? "ink";
      }
      if (root.dataset.theme !== theme) root.dataset.theme = theme;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);
  return null;
}
