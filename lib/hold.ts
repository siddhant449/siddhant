"use client";

import { useEffect, type RefObject } from "react";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";
import type { VirtualScrollData } from "lenis";
import { audio } from "./audio";
import { LYRICS } from "./lyrics";
import { scrollTop } from "./scroll";

/** The landing glide (s), eased out so the page settles onto the line. */
const GLIDE = 0.7;
/** While the words are sung the wheel is divided by this: the page all but stops. */
const DAMP = 8;
/** The longest a hold lasts once landed (s). */
const CAP = 6;
/** The line counts as sung until this long after its last word (s). */
const TAIL = 0.5;
/** A frame is caught once its top is this close below the viewport top (× viewport height), scrolling down. */
const CATCH = 0.3;
/** Pushed this far (× viewport height) through the damping, a determined scroll moves on. */
const ESCAPE = 0.12;
/** Faster than this (px per frame) is a fling that wants to go further, not a scroll onto the line. */
const FLING = 0.16;
/** The wheel must have moved this recently (ms) for the movement to count as the visitor's own scroll. */
const RECENT = 700;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type Frame = { id: string; el: HTMLElement; top: number };
type Hold = { frame: Frame; phase: "glide" | "hold"; at: number; landed: number; sang: boolean };

const frames = new Map<string, Frame>();
/** Lines held once already this visit. */
const done = new Set<string>();
let current: Hold | null = null;
let lenis: Lenis | null = null;
let unwire: (() => void) | null = null;
let raf = 0;
let wheelAt = -Infinity;
/** The last rail, nav or anchor jump: the scroll after it is the page's, not the visitor's. */
let jumpAt = -Infinity;

const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"]);

function measure() {
  const y = window.scrollY;
  for (const f of frames.values()) f.top = f.el.getBoundingClientRect().top + y;
}

/** Desktop with a mouse or trackpad, sound on, full motion: the only place a hold applies. */
function eligible() {
  return (
    audio.getState().soundOn &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The window (deck time) in which the line is sung. */
function sungWindow(id: string): [number, number] {
  const line = LYRICS[id];
  return [line.words[0].t - 0.15, line.words[line.words.length - 1].t + TAIL];
}

function release() {
  if (!current) return;
  done.add(current.frame.id);
  current = null;
  cancelAnimationFrame(raf);
  raf = 0;
}

/** While a hold is on: watch for the line ending, the cap, and anything that should end it early. */
function watch() {
  raf = 0;
  const h = current;
  if (!h || !lenis) return;
  const now = performance.now();
  const y = scrollTop();
  const off = Math.abs(y - h.frame.top);
  if (jumpAt > h.at || !audio.getState().soundOn) return release();
  if (h.phase === "glide") {
    // A glide that something else took over (a forced jump) never completes: let go.
    if (now - h.at > (GLIDE + 0.4) * 1000) {
      if (off > 4) return release();
      land(h);
    }
  } else {
    if (off > window.innerHeight * ESCAPE || now - h.landed > CAP * 1000) return release();
    const line = LYRICS[h.frame.id];
    const t = audio.trackTime(line.cue);
    if (t !== null) {
      const [a, b] = sungWindow(h.frame.id);
      if (t >= a && t <= b) h.sang = true;
      // Sung, and over: the page is free again.
      else if (h.sang) return release();
    }
  }
  raf = requestAnimationFrame(watch);
}

function land(h: Hold) {
  if (h.phase === "hold") return;
  h.phase = "hold";
  h.landed = performance.now();
}

function engage(f: Frame) {
  if (!lenis) return;
  // The frame's place now, in case the page above it has changed height since it was measured. (Lenis
  // has just scrolled, and the scroll event that updates lib/scroll comes later: read the live value.)
  f.top = f.el.getBoundingClientRect().top + window.scrollY;
  const h: Hold = { frame: f, phase: "glide", at: performance.now(), landed: 0, sang: false };
  current = h;
  lenis.scrollTo(f.top, { duration: GLIDE, easing: easeOut, lock: true, onComplete: () => current === h && land(h) });
  if (!raf) raf = requestAnimationFrame(watch);
}

/** Every Lenis frame: catch a line's frame as it comes into position on the visitor's own scroll down. */
function onScroll(l: Lenis) {
  if (current || !frames.size) return;
  const now = performance.now();
  if (l.direction !== 1 || now - wheelAt > RECENT || jumpAt > wheelAt) return;
  const vh = window.innerHeight;
  if (Math.abs(l.velocity) > vh * FLING) return;
  const y = l.animatedScroll;
  for (const f of frames.values()) {
    if (done.has(f.id)) continue;
    const ahead = f.top - y;
    if (ahead > vh * CATCH || ahead < -vh * 0.04) continue;
    if (!eligible()) return;
    return engage(f);
  }
}

/** The wheel, while the words are sung: heavily damped, so a determined scroll still moves on. */
function damp(data: VirtualScrollData) {
  if (current?.phase === "hold") {
    data.deltaY /= DAMP;
    data.deltaX /= DAMP;
  }
  return true;
}

function wire(l: Lenis) {
  unwire?.();
  lenis = l;
  const before = l.options.virtualScroll;
  l.options.virtualScroll = (data) => (before && before(data) === false ? false : damp(data));
  const off = l.on("scroll", onScroll);
  const onWheel = (e: WheelEvent) => {
    if (e.deltaY !== 0 && !e.ctrlKey) wheelAt = performance.now();
  };
  const onKey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (!SCROLL_KEYS.has(e.key) || el?.closest("input, textarea, select, [contenteditable]")) return;
    // Keys keep working: one simply ends the hold.
    release();
  };
  // A jump (scene rail, nav, call sheet, any in-page anchor) beats a glide and never starts a hold.
  const onJump = (e: Event) => {
    const el = e.target as HTMLElement | null;
    if (!el?.closest('nav, a[href*="#"]')) return;
    jumpAt = performance.now();
    if (current?.phase === "glide") {
      // Unlock the glide at once, so an anchor jump that doesn't force its way through still goes.
      l.stop();
      l.start();
    }
    release();
  };
  const ro = new ResizeObserver(measure);
  ro.observe(document.documentElement);
  window.addEventListener("wheel", onWheel, { passive: true, capture: true });
  window.addEventListener("keydown", onKey);
  document.addEventListener("pointerdown", onJump, true);
  document.addEventListener("click", onJump, true);
  window.addEventListener("resize", measure);
  unwire = () => {
    release();
    off();
    l.options.virtualScroll = before;
    ro.disconnect();
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("pointerdown", onJump, true);
    document.removeEventListener("click", onJump, true);
    window.removeEventListener("resize", measure);
    lenis = null;
    unwire = null;
  };
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  // The hold's state, for verification in development.
  (window as unknown as { __hold: () => unknown }).__hold = () => ({
    current: current && { id: current.frame.id, phase: current.phase, top: current.frame.top, sang: current.sang },
    done: [...done],
  });
}

/**
 * The soft hold for a lyric moment: scrolling down onto the line lands exactly on it and all
 * but stops while it is sung, then lets go. `ref` is the element whose top is the line's frame;
 * `lineId` is its entry in lib/lyrics.ts.
 *
 * Landing glides the page onto the frame (`lock` holds the wheel off for the glide). Holding
 * divides the wheel by DAMP through Lenis's `virtualScroll`, so a determined scroll still moves
 * on and keys keep working (a key, or pushing ESCAPE through the damping, ends it). It lets go
 * when the deck has sung the line (from LYRICS) or after CAP seconds, whichever comes first.
 * Only on desktop (`pointer: fine`) with sound on, scrolling down, once per visit per line;
 * never on touch, under reduced motion (no Lenis), or on a rail or nav jump.
 */
export function useLyricHold(ref: RefObject<HTMLElement | null>, lineId: string) {
  const instance = useLenis();
  useEffect(() => {
    if (!instance || instance === lenis) return;
    wire(instance);
  }, [instance]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !LYRICS[lineId]) return;
    const f: Frame = { id: lineId, el, top: el.getBoundingClientRect().top + window.scrollY };
    frames.set(lineId, f);
    return () => {
      if (frames.get(lineId) === f) frames.delete(lineId);
      if (current?.frame === f) release();
    };
  }, [ref, lineId]);
}
