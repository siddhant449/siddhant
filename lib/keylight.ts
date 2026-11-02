"use client";

import { useEffect, type RefObject } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";

/**
 * One key light for the whole site, the pillar light from the ledge photograph.
 * x, y: position as a fraction of the viewport. r: radius in vmax. d: shadow depth
 * outside the light (0 = no veil, 1 = black). w: warmth of the lit area (0..1).
 */
export type Key = { x: number; y: number; r: number; d: number; w: number };

/** Where the light rests in the hero: on the pillar edge, camera-left. */
export const PILLAR: Key = { x: 0.167, y: 0.4, r: 60, d: 0, w: 0.6 };

const target: Key = { ...PILLAR };
const current: Key = { ...PILLAR };
const pointer = { x: 0.5, y: 0.5 };

/** The elements that draw with the light; only they receive its CSS variables. */
const lit = new Set<HTMLElement>();
const VARS = ["--kx", "--ky", "--kr", "--kd", "--kw"] as const;
const written = ["", "", "", "", ""];
/** Drawings of the light (a canvas veil), called whenever it moves. */
const watchers = new Set<(k: Readonly<Key>) => void>();
let wake = () => {};

function format(k: Key) {
  return [k.x.toFixed(4), k.y.toFixed(4), k.r.toFixed(2), k.d.toFixed(3), k.w.toFixed(3)];
}

export const keyLight = {
  set(k: Partial<Key>) {
    Object.assign(target, k);
    wake();
  },
  /** The light's live position; shaders read this every frame for their uKey uniform. */
  get(): Readonly<Key> {
    return current;
  },
};

let started = false;

/**
 * Springs the light toward its target and hands it, as CSS variables, to the elements that
 * draw with it. Not to :root: an inherited variable changing there restyles the whole page
 * every frame. It writes only what changed, and sleeps once the light has settled.
 */
export function startKeyLight(reduce: boolean) {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  let raf = 0;
  let last = 0;

  const tick = (now: number) => {
    const dt = Math.min(now - last, 64);
    last = now;
    const k = reduce ? 1 : 1 - Math.exp(-dt / 180);
    // The cursor only nudges the light (±8%); scroll carries it between focal points.
    const nudge = reduce ? 0 : 0.08;
    const tx = target.x + (pointer.x - 0.5) * nudge;
    const ty = target.y + (pointer.y - 0.5) * nudge;
    current.x += (tx - current.x) * k;
    current.y += (ty - current.y) * k;
    current.r += (target.r - current.r) * k;
    current.d += (target.d - current.d) * k;
    current.w += (target.w - current.w) * k;
    const next = format(current);
    let moved = false;
    next.forEach((v, i) => {
      if (v === written[i]) return;
      written[i] = v;
      moved = true;
      lit.forEach((el) => el.style.setProperty(VARS[i], v));
    });
    if (moved) watchers.forEach((fn) => fn(current));
    const settled =
      Math.abs(tx - current.x) < 1e-4 &&
      Math.abs(ty - current.y) < 1e-4 &&
      Math.abs(target.r - current.r) < 0.01 &&
      Math.abs(target.d - current.d) < 1e-3 &&
      Math.abs(target.w - current.w) < 1e-3;
    raf = settled ? 0 : requestAnimationFrame(tick);
  };

  wake = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const move = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = e.clientY / window.innerHeight;
    wake();
  };
  window.addEventListener("pointermove", move, { passive: true });
  wake();
  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    wake = () => {};
    window.removeEventListener("pointermove", move);
    started = false;
  };
}

/** Calls `fn` with the light now and whenever it moves; returns the unsubscribe. */
export function watchKeyLight(fn: (k: Readonly<Key>) => void) {
  watchers.add(fn);
  fn(current);
  return () => {
    watchers.delete(fn);
  };
}

/** Lets an element draw with the key light: it receives --kx --ky --kr --kd --kw as the light moves. */
export function useKeyLit(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    lit.add(el);
    format(current).forEach((v, i) => el.style.setProperty(VARS[i], v));
    return () => {
      lit.delete(el);
    };
  }, [ref]);
}

/** The key at progress `p` along [progress, key] stops, interpolated between neighbours. */
function sample(frames: [number, Partial<Key>][], p: number): Partial<Key> {
  let i = 0;
  while (i < frames.length - 1 && p > frames[i + 1][0]) i++;
  const [p0, a] = frames[i];
  const [p1, b] = frames[Math.min(i + 1, frames.length - 1)];
  const t = p1 === p0 ? 0 : Math.min(Math.max((p - p0) / (p1 - p0), 0), 1);
  const out: Partial<Key> = {};
  for (const key of Object.keys({ ...a, ...b }) as (keyof Key)[]) {
    const va = a[key] ?? b[key]!;
    const vb = b[key] ?? va;
    out[key] = va + (vb - va) * t;
  }
  return out;
}

/**
 * Drives the key light from a scene's scroll progress. `frames` are [progress, key]
 * stops; values in between are interpolated. Only the active scene should drive it, and
 * it takes the light the moment it becomes active, scrolled to or jumped to.
 */
export function useKeyFrames(progress: MotionValue<number>, frames: [number, Partial<Key>][], active: boolean) {
  useMotionValueEvent(progress, "change", (p) => {
    if (active && frames.length) keyLight.set(sample(frames, p));
  });
  useEffect(() => {
    if (active && frames.length) keyLight.set(sample(frames, progress.get()));
  }, [active, progress, frames]);
}
