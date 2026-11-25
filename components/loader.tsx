"use client";

import { useEffect, useRef } from "react";
import s from "./curtain.module.css";

/**
 * Entry curtain, after dennissnellenberg.com. Timings were logged frame by
 * frame from the live site: the words fade in over .3s, the first greeting
 * holds .44s, then one every .105s, the last holds .27s; the screen lifts
 * 100% in .55s (cubic in-out) while the words fade over .33s, and the 10vh
 * curved lip flattens over .6s, starting .08s into the lift.
 *
 * It renders on the server so it covers the first paint, runs once per
 * session (html[data-seen] hides it on repeat visits), and any click, key,
 * wheel or touch skips straight to the lift. When it lifts it marks
 * html[data-loaded] and fires "sk:ready" so entrances can start.
 */
const WORDS = ["Hello", "नमस्ते", "કેમ છો", "Bonjour", "Ciao", "Olá", "こんにちは", "Hallå", "Hola"];
const T_IN = 0.2;
const FIRST = 0.44;
const STEP = 0.105;
const LAST = 0.27;
const T_LIFT = T_IN + FIRST + (WORDS.length - 1) * STEP + LAST;
const D_LIFT = 0.55;
const D_FADE = 0.33;
const LIP_DELAY = 0.08;
const D_LIP = 0.6;

const cubicInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function markReady() {
  const root = document.documentElement;
  if (root.hasAttribute("data-loaded")) return;
  root.dataset.loaded = "";
  window.dispatchEvent(new Event("sk:ready"));
}

/** Runs `cb` once the entry curtain has started lifting (or immediately on repeat visits). */
export function onReady(cb: () => void) {
  if (document.documentElement.hasAttribute("data-loaded")) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener("sk:ready", handler, { once: true });
  return () => window.removeEventListener("sk:ready", handler);
}

export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const lip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const el = root.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || html.hasAttribute("data-seen") || reduce) {
      if (el) el.style.display = "none";
      markReady();
      return;
    }

    html.style.overflow = "hidden";
    const items = words.current ? Array.from(words.current.children) as HTMLElement[] : [];
    let start = performance.now();
    let raf = 0;
    let skip = false;
    let ready = false;
    const onSkip = () => {
      skip = true;
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onSkip, { passive: true }));

    const finish = () => {
      el.style.display = "none";
      html.style.overflow = "";
      events.forEach((e) => window.removeEventListener(e, onSkip));
    };

    const tick = (now: number) => {
      let t = (now - start) / 1000;
      if (skip && t < T_LIFT) {
        start -= (T_LIFT - t) * 1000;
        t = T_LIFT;
      }
      const fadeIn = clamp01((t - T_IN) / 0.3);
      const fadeOut = clamp01((t - T_LIFT - LIP_DELAY) / D_FADE);
      if (words.current) words.current.style.opacity = String(fadeIn * (1 - fadeOut));
      const idx = t < T_IN + FIRST ? 0 : Math.min(WORDS.length - 1, 1 + Math.floor((t - T_IN - FIRST) / STEP));
      items.forEach((w, i) => (w.style.opacity = i === idx ? "1" : "0"));
      if (screen.current) screen.current.style.transform = `translate3d(0, ${-100 * cubicInOut(clamp01((t - T_LIFT) / D_LIFT))}%, 0)`;
      if (lip.current) lip.current.style.height = `${10 * (1 - cubicInOut(clamp01((t - T_LIFT - LIP_DELAY) / D_LIP)))}vh`;
      if (!ready && t > T_LIFT) {
        ready = true;
        html.style.overflow = "";
        markReady();
      }
      if (t > T_LIFT + LIP_DELAY + D_LIP + 0.05) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const go = () => {
      start = performance.now();
      raf = requestAnimationFrame(tick);
    };
    // Wait for the fonts so the greetings don't swap mid-flick, but never longer than 1.2s.
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      go();
    };
    const cap = window.setTimeout(begin, 1200);
    document.fonts?.ready.then(begin, begin);

    return () => {
      // Only stop this run; React may mount the effect again (Strict Mode), which restarts it.
      started = true;
      window.clearTimeout(cap);
      cancelAnimationFrame(raf);
      html.style.overflow = "";
      events.forEach((e) => window.removeEventListener(e, onSkip));
    };
  }, []);

  return (
    <div ref={root} aria-hidden className={s.loader}>
      <div ref={screen} className={s.screen}>
        <div ref={words} className={s.words}>
          {WORDS.map((w) => (
            <p key={w} lang={w === "नमस्ते" ? "hi" : w === "કેમ છો" ? "gu" : w === "こんにちは" ? "ja" : undefined}>
              {w}
            </p>
          ))}
        </div>
        <div ref={lip} className={s.lip}>
          <i />
        </div>
      </div>
    </div>
  );
}
