"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { bezier, elasticOut, hasFinePointer, MAGNETIC, prefersReducedMotion, tween } from "@/lib/kit/motion";
import styles from "./kit.module.css";

/**
 * Dennis Snellenberg's magnetic button. The wrapper moves by (cursor − centre) / size × 100px,
 * an inner element marked `data-magnet-inner` by a further × 50px. It follows over 1.5s and
 * springs back with elastic.out(1, 0.3). Measured from the already-moved rect, as the reference does.
 * Fine pointers only; still under reduced motion.
 */
export function Magnetic({
  children,
  className,
  pull = MAGNETIC.pull,
  inner = MAGNETIC.inner,
}: {
  children: ReactNode;
  className?: string;
  pull?: number;
  inner?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !hasFinePointer()) return;
    const label = el.querySelector<HTMLElement>("[data-magnet-inner]");
    const follow = bezier(MAGNETIC.ease);
    const spring = elasticOut(MAGNETIC.release.amplitude, MAGNETIC.release.period);
    const st = { x: 0, y: 0, ix: 0, iy: 0 };
    let stop: (() => void) | undefined;

    const apply = () => {
      el.style.transform = `translate3d(${st.x}px, ${st.y}px, 0)`;
      if (label) label.style.transform = `translate3d(${st.ix}px, ${st.iy}px, 0)`;
    };
    const go = (x: number, y: number, ix: number, iy: number, dur: number, ease: (t: number) => number) => {
      stop?.();
      const f = { ...st };
      stop = tween(dur, ease, (k) => {
        st.x = f.x + (x - f.x) * k;
        st.y = f.y + (y - f.y) * k;
        st.ix = f.ix + (ix - f.ix) * k;
        st.iy = f.iy + (iy - f.iy) * k;
        apply();
      });
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left - r.width / 2) / r.width;
      const ny = (e.clientY - r.top - r.height / 2) / r.height;
      go(nx * pull, ny * pull, nx * inner, ny * inner, MAGNETIC.duration, follow);
    };
    const onLeave = () => go(0, 0, 0, 0, MAGNETIC.release.duration, spring);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      stop?.();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
      if (label) label.style.transform = "";
    };
  }, [pull, inner]);

  return (
    <span ref={ref} className={`${styles.magnet} ${className ?? ""}`}>
      {children}
    </span>
  );
}
