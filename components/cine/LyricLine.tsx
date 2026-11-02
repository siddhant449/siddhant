"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import { audio } from "@/lib/audio";
import { LYRICS, LYRIC_HOLD, lineText } from "@/lib/lyrics";
import styles from "./LyricLine.module.css";

type Props = {
  lineId: keyof typeof LYRICS;
  /** Scroll progress (0..1) used to reveal the words when sound is off. */
  fallback: MotionValue<number>;
  /** Fallback reveal window inside `fallback`'s range. */
  window?: [number, number];
  /** Fires once, the first time every word is lit. */
  onLand?: () => void;
  /**
   * 0..1 visibility of the line (e.g. its card's opacity, or how much of it the light has
   * reached); at 0.5 or below it counts as off screen: it neither holds its song nor lights.
   */
  presence?: MotionValue<number>;
  className?: string;
  as?: "p" | "h2" | "h3";
};

/**
 * A lyric set as type. With sound on, each word lights the moment it is sung (read
 * from the deck's playback position, not a timer, and only when the song has played into
 * the line rather than jumped around it), holds, then falls back into shadow
 * until the loop comes round again. Scroll lights words too: a word lights at the earlier
 * of its scroll mark and its sung time, so a word lit by scroll stays lit.
 *
 * While the line is on screen it holds its song on the bars that carry it (the director
 * brings the line in within a bar), so what is read is what is heard.
 *
 * Words carry `data-lit` and the sung word `data-current`, so scenes can style them.
 */
export default function LyricLine({ lineId, fallback, window: win, onLand, presence, className, as = "p" }: Props) {
  const [lo, hi] = win ?? [0.15, 0.6];
  const line = LYRICS[lineId];
  const root = useRef<HTMLElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const landed = useRef(false);
  const onLandRef = useRef(onLand);
  useEffect(() => {
    onLandRef.current = onLand;
  });

  // On screen (and not faded out): hold this lyric's song on the bars that carry the line.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = false;
    let focused = false;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const watch = () => {
      const on = inView && (presence ? presence.get() > 0.5 : true);
      if (on !== focused) {
        focused = on;
        if (on) audio.focusLyric(lineId);
        else audio.blurLyric(lineId);
      }
      raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      if (focused) audio.blurLyric(lineId);
    };
  }, [lineId, presence]);

  useEffect(() => {
    let raf = 0;
    const n = line.words.length;
    const last = line.words[n - 1].t;
    const first = line.words[0].t - 0.03;
    let lit = line.words.map(() => false);
    let current = -1;
    // A pass of the line: the song has played into its first word. A song jumping around the line
    // (a loop of other bars that happens to sit after it) never lights it.
    let prev: number | null = null;
    let pass = false;
    /** What each word was last written as ("" = never), so a word is only touched when it changes. */
    const shown = line.words.map(() => "");
    const tick = () => {
      // Off screen (its card not up yet, or covered), the line keeps what it has and lights nothing new.
      if (!presence || presence.get() > 0.5) {
        const t = audio.trackTime(line.cue);
        if (t === null || t < first - 0.6 || t > last + LYRIC_HOLD) pass = false;
        else if (prev !== null && prev < first && t >= first && t - prev < 0.5) pass = true;
        prev = t;
        const p = (fallback.get() - lo) / (hi - lo);
        const scrolled = line.words.map((_, i) => p >= (i + 1) / (n + 1));
        const sung = line.words.map((w) => pass && t !== null && t >= w.t - 0.03 && t <= last + LYRIC_HOLD);
        lit = line.words.map((_, i) => scrolled[i] || sung[i]);
        current = sung.includes(true) ? sung.lastIndexOf(true) : scrolled.lastIndexOf(true);
      }
      lit.forEach((on, i) => {
        const el = wordRefs.current[i];
        const state = `${on ? 1 : 0}${i === current ? 1 : 0}`;
        if (!el || shown[i] === state) return;
        shown[i] = state;
        el.dataset.lit = on ? "1" : "0";
        if (i === current) el.dataset.current = "1";
        else delete el.dataset.current;
      });
      if (!landed.current && lit.every(Boolean)) {
        landed.current = true;
        onLandRef.current?.();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [line, fallback, lo, hi, presence]);

  const Tag = as;
  return (
    <Tag ref={root as React.Ref<HTMLHeadingElement>} className={`${styles.line} ${className ?? ""}`} aria-label={lineText(line)} data-lyric="">
      {line.words.map((w, i) => (
        <span
          key={`${w.w}-${i}`}
          ref={(el) => {
            wordRefs.current[i] = el;
          }}
          className={styles.word}
          data-lit="0"
          aria-hidden
        >
          {w.w}
        </span>
      ))}
    </Tag>
  );
}
