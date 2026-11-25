"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type FigureProps = {
  /** True only while this figure is on screen; everything else stays paused. */
  active: boolean;
  /** prefers-reduced-motion: draw one still frame and never loop. */
  reduced: boolean;
  /**
   * Under 1200px the figure is laid out as a deck of panels at real size
   * (no scaled stage), so text stays legible on tablets and phones.
   */
  deck?: boolean;
  /** Accessible description of the figure (used by the deck, which owns its role="img"). */
  label?: string;
};

const wideQuery = "(min-width: 700px)";
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(wideQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** Tablet and small laptop (700–1199px): the deck lays its panels out in two columns instead of a swipe track. */
export function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(wideQuery).matches,
    () => false,
  );
}

/** Content width of an element, tracked with a ResizeObserver (0 until measured). */
export function useWidth(ref: React.RefObject<HTMLElement | null>, on = true) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !on) return;
    const measure = () => setW(Math.floor(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, on]);
  return w;
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}

/** One requestAnimationFrame loop, only while `active` and the tab is visible. */
export function useLoop(active: boolean, tick: (t: number, dt: number) => void) {
  const cb = useRef(tick);
  useEffect(() => {
    cb.current = tick;
  });
  const clock = useRef(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        clock.current += dt;
        cb.current(clock.current, dt);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/** A steady beat for state changes (cards moving, rows tagging), paused like the loop. */
export function useEvery(active: boolean, ms: number, fn: () => void) {
  const cb = useRef(fn);
  useEffect(() => {
    cb.current = fn;
  });
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (!document.hidden) cb.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
}

/*
 * fit() runs on every animation frame, so the on-screen scale of each canvas is cached: reading
 * it means a getBoundingClientRect, which forces a layout mid-frame. The cache is dropped when
 * the window resizes or a figure stage is rescaled (invalidateFit()).
 */
let fitGen = 0;
const fitCache = new WeakMap<HTMLCanvasElement, { gen: number; w: number; h: number; k: number }>();
/** Forget every canvas's measured scale (call when a figure stage's scale changes). */
export function invalidateFit() {
  fitGen++;
}
if (typeof window !== "undefined") window.addEventListener("resize", invalidateFit, { capture: true });

/**
 * Size a canvas for its on-screen box (the stage may be scaled) and return a
 * context that draws in design pixels. DPR is capped at 2, 1.5 on phones.
 */
export function fit(cv: HTMLCanvasElement, w: number, h: number) {
  let m = fitCache.get(cv);
  if (!m || m.gen !== fitGen || m.w !== w || m.h !== h) {
    const cap = window.innerWidth <= 820 ? 1.5 : 2;
    const dpr = Math.min(cap, window.devicePixelRatio || 1);
    // CSS size in design pixels; the stage transform scales it on screen.
    if (cv.style.width !== `${w}px`) {
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
    }
    const r = cv.getBoundingClientRect();
    m = { gen: fitGen, w, h, k: ((r.width || w) / w) * dpr };
    // An unlaid-out canvas (width 0) is measured again next time.
    if (r.width) fitCache.set(cv, m);
  }
  const bw = Math.max(1, Math.round(w * m.k));
  const bh = Math.max(1, Math.round(h * m.k));
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  const c = cv.getContext("2d");
  if (!c) return null;
  c.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0);
  return c;
}

/** Deterministic noise so every visit draws the same scene. */
export function rng(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** The Geist Mono family as next/font registered it, for canvas text. */
export function monoFont(px: number) {
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
  return `${px}px ${fam || "ui-monospace"}, ui-monospace, monospace`;
}
