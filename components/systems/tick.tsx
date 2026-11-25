"use client";

import { useEffect, useRef } from "react";
import { onReady } from "@/components/loader";

/**
 * A count that runs up once when it comes into view (1.4s, ease-out cubic).
 * Only whole counts tick ("1,313", "15+"); percentages and "2.5D" stay as written.
 * The server renders the final value, so no-JS and reduced motion read it directly.
 */
export function Tick({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const m = value.match(/^([\d,]+)(\+?)$/);
    if (
      !el ||
      !m ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const target = Number(m[1].replace(/,/g, ""));
    const comma = m[1].includes(",");
    const fmt = (n: number) =>
      (comma ? n.toLocaleString("en-US") : String(n)) + m[2];
    let raf = 0;
    let io: IntersectionObserver | null = null;
    const start = () => {
      io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          io?.disconnect();
          const t0 = performance.now();
          const step = (now: number) => {
            const k = Math.min(1, (now - t0) / 1400);
            el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - k, 3))));
            if (k < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        },
        { threshold: 0.6 },
      );
      io.observe(el);
    };
    // Wait for the entry curtain, so a deep link doesn't count behind it.
    const off = onReady(start);
    return () => {
      off();
      io?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}
