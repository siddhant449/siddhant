"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { onReady } from "@/components/loader";
import type { SystemKind } from "@/lib/copy/systems";
import s from "./systems.module.css";
import { useReducedMotion, type FigureProps } from "./use-figure";

/* Each figure is its own chunk, fetched only when its chapter nears the viewport. */
const figures: Record<SystemKind, React.ComponentType<FigureProps>> = {
  clinical: dynamic(() => import("./figure-clinical"), { ssr: false }),
  commerce: dynamic(() => import("./figure-commerce"), { ssr: false }),
  risk: dynamic(() => import("./figure-risk"), { ssr: false }),
  shizuku: dynamic(() => import("./figure-shizuku"), { ssr: false }),
};

/** Linear's illustration heights for each chapter, in design pixels at 1333 wide. */
const heights: Record<SystemKind, number> = { clinical: 626, commerce: 633, risk: 632, shizuku: 592 };

const DESIGN_W = 1333;
/** Below this the scaled stage gets too small to read: the figure becomes a deck of real-size panels. */
const deckQuery = "(max-width: 1199px)";

export function FigureSlot({ kind, label }: { kind: SystemKind; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(false);
  const [ready, setReady] = useState(false);
  const active = seen && ready;
  const [scale, setScale] = useState(1);
  const [deck, setDeck] = useState(false);
  const reduced = useReducedMotion();
  const Figure = figures[kind];

  // Mount a screen ahead; animate only while visible.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setMounted(true);
        near.disconnect();
      }
    }, { rootMargin: "100% 0px" });
    const vis = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin: "0px" });
    near.observe(el);
    vis.observe(el);
    // Nothing animates behind the entry curtain.
    const off = onReady(() => setReady(true));
    return () => {
      near.disconnect();
      vis.disconnect();
      off();
    };
  }, []);

  // A deck under 1200px; above, the 1333px stage scaled to the column.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const mq = window.matchMedia(deckQuery);
    const measure = () => {
      setDeck(mq.matches);
      setScale(Math.min(1, el.clientWidth / DESIGN_W));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);

  if (deck) {
    return (
      <div ref={box} className={s.ill} data-deck="">
        {mounted ? (
          <Figure active={active} reduced={reduced} deck label={label} />
        ) : (
          <div className={s.placeholder} aria-hidden />
        )}
      </div>
    );
  }

  return (
    <div ref={box} className={s.ill} style={{ height: Math.round(heights[kind] * scale) }} role="img" aria-label={label}>
      {mounted ? (
        <div className={s.stage} style={{ height: heights[kind], transform: `scale(${scale})` }}>
          <Figure active={active} reduced={reduced} />
        </div>
      ) : (
        <div className={s.placeholder} aria-hidden />
      )}
    </div>
  );
}
