"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { systemsCopy } from "@/lib/copy/systems";
import s from "./systems.module.css";
import { useReducedMotion, useWide } from "./use-figure";

/*
  The compact figure (under 1200px): the figure's panels at real size instead
  of a scaled 1333px stage. From 700px the panels sit in a two-column grid
  (a panel can span both); on phones they ride a native scroll-snap track
  (touch swipes it, the tabs jump to a panel). Nothing here listens to page
  scroll, so it stays smooth on touch.
*/

/** One panel's shell: Linear's floating box with a head row. */
export function Card({
  title,
  sub,
  note,
  icon,
  children,
  flush,
}: {
  title: string;
  sub?: string;
  note?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Body without padding (the board and lists run edge to edge). */
  flush?: boolean;
}) {
  return (
    <div className={s.dCard}>
      <div className={s.grain} style={{ opacity: 0.9 }} />
      <div className={s.dHead}>
        {icon}
        <span className={s.boxName}>{title}</span>
        {sub ? <span className={s.boxSub}>{sub}</span> : null}
        {note ? <span className={`${s.sim} ${s.dNote}`}>{note}</span> : null}
      </div>
      <div className={flush ? s.dFlush : s.dBody}>{children}</div>
      <div className={s.shine} style={{ "--sx": "100%", "--sy": "0%" } as React.CSSProperties} />
    </div>
  );
}

export function Deck({
  names,
  label,
  span,
  children,
}: {
  names: readonly string[];
  label: string;
  /** Panels that take the full row in the two-column grid. */
  span?: readonly boolean[];
  children: React.ReactNode;
}) {
  const panels = Children.toArray(children);
  const n = panels.length;
  const track = useRef<HTMLDivElement>(null);
  const wide = useWide();
  const sliding = !wide && n > 1;
  const [shown, setShown] = useState<number[]>([0]);
  const reduced = useReducedMotion();

  // Which panels are mostly in view (the tabs light up for those).
  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const l = el.scrollLeft;
    const r = l + el.clientWidth;
    const on: number[] = [];
    Array.from(el.children).forEach((c, i) => {
      const a = (c as HTMLElement).offsetLeft;
      const b = a + (c as HTMLElement).offsetWidth;
      const vis = Math.max(0, Math.min(b, r) - Math.max(a, l)) / (b - a || 1);
      if (vis > 0.6) on.push(i);
    });
    setShown((prev) => (on.length && on.join() !== prev.join() ? on : prev));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el || !sliding) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    sync();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [sliding, sync]);

  const go = (i: number) => {
    const el = track.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    el.scrollTo({ left: slide.offsetLeft - pad, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className={s.deck} data-sliding={sliding ? "" : undefined}>
      {sliding ? (
        <div className={s.tabs} role="group" aria-label={systemsCopy.deckLabel}>
          {names.map((name, i) => (
            <button
              key={name}
              type="button"
              className={s.tab}
              aria-pressed={shown.includes(i)}
              aria-label={`${systemsCopy.show} ${name}`}
              onClick={() => go(i)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <div role="img" aria-label={label}>
        <div ref={track} className={s.track}>
          {panels.map((p, i) => (
            <div key={names[i] ?? i} className={s.slide} data-span={span?.[i] ? "" : undefined}>
              {p}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
