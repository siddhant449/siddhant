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
/** On phones the stage is shown at 0.62 and cropped from this x (Linear's mobile crops). */
const phoneCrop: Record<SystemKind, number> = { clinical: 250, commerce: 700, risk: 255, shizuku: 440 };

const DESIGN_W = 1333;
const PHONE = 820;
const PHONE_SCALE = 0.62;
const PHONE_H = 312;

export function FigureSlot({ kind, label }: { kind: SystemKind; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(false);
  const [ready, setReady] = useState(false);
  const active = seen && ready;
  const [fitState, setFit] = useState({ scale: 1, x: 0, h: heights[kind] });
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

  // Scale the 1333px stage to the column; phones get a fixed crop.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      if (window.innerWidth <= PHONE) {
        setFit({ scale: PHONE_SCALE, x: -phoneCrop[kind] * PHONE_SCALE, h: PHONE_H });
      } else {
        const sc = Math.min(1, el.clientWidth / DESIGN_W);
        setFit({ scale: sc, x: 0, h: Math.round(heights[kind] * sc) });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kind]);

  return (
    <div ref={box} className={s.ill} style={{ height: fitState.h }} role="img" aria-label={label}>
      {mounted ? (
        <div
          className={s.stage}
          style={{ height: heights[kind], transform: `translateX(${fitState.x}px) scale(${fitState.scale})` }}
        >
          <Figure active={active} reduced={reduced} />
        </div>
      ) : (
        <div className={s.placeholder} aria-hidden />
      )}
    </div>
  );
}
