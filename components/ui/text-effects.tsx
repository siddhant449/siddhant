"use client";

import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Scroll-read text: each word lights up as the paragraph is scrolled. */
/* ------------------------------------------------------------------ */

function ScrollWord({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}
    </motion.span>
  );
}

export function ScrollRead({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return (
            <span key={i}>
              <ScrollWord word={word} progress={scrollYProgress} range={[start, end]} />
              {i < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Scramble: characters cycle through glyphs and settle left to right. */
/* ------------------------------------------------------------------ */

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789@._-/#*+";

export function useScramble(text: string, duration = 650) {
  const [output, setOutput] = useState(text);
  const frame = useRef(0);

  const run = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * text.length);
      let next = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (i < settled || ch === " ") next += ch;
        else next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOutput(next);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [duration, text]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { output, run };
}

/** Visible text scrambles; the real text stays available to screen readers. */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const { output, run } = useScramble(text);
  return (
    <span className={className} onPointerEnter={run} onFocus={run}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{output}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Roll: the label slides up and an identical copy takes its place.     */
/* Needs a .group ancestor (the link or button).                        */
/* ------------------------------------------------------------------ */

export function Roll({ children }: { children: string }) {
  return (
    <span className="roll">
      <span>{children}</span>
      <span aria-hidden>{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Magnetic: the element leans toward the pointer while it is near.     */
/* ------------------------------------------------------------------ */

export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.5 });

  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={`inline-block ${className ?? ""}`}
    >
      {children}
    </motion.span>
  );
}
