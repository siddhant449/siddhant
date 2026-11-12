"use client";

import { motion, type MotionValue } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * One line of display type sized to fill its container exactly, measured at a
 * fixed width-axis value so a later width animation never changes the size.
 */
export function FitLine({
  text,
  measure,
  wdth = 100,
  weight = 800,
  fallback,
  variation,
  className,
  innerClassName,
  show = true,
  delay = 0,
}: {
  text: string;
  /** Size to fit this string instead, so stacked lines can share one size. */
  measure?: string;
  wdth?: number;
  weight?: number;
  /** Font size used before measurement (server render), e.g. "12vw". */
  fallback: string;
  variation?: MotionValue<string>;
  className?: string;
  innerClassName?: string;
  show?: boolean;
  delay?: number;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<string>(fallback);

  useLayoutEffect(() => {
    const fit = () => {
      if (!box.current || !probe.current) return;
      const avail = box.current.clientWidth;
      const natural = probe.current.getBoundingClientRect().width;
      if (avail && natural) setSize(`${(avail / natural) * 100}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [text, measure]);

  return (
    <span ref={box} className={`relative block ${className ?? ""}`}>
      {/* Measuring copy, clipped so it never widens the page. */}
      <span aria-hidden className="pointer-events-none invisible absolute inset-0 overflow-hidden">
        <span
          ref={probe}
          className="absolute left-0 top-0 whitespace-nowrap"
          style={{ fontSize: "100px", fontWeight: weight, fontVariationSettings: `"wdth" ${wdth}` }}
        >
          {measure ?? text}
        </span>
      </span>
      <span className="block overflow-hidden pb-[0.04em]">
        <motion.span
          className={`block whitespace-nowrap ${innerClassName ?? ""}`}
          style={{
            fontSize: size,
            fontWeight: weight,
            fontVariationSettings: variation ?? `"wdth" ${wdth}`,
          }}
          initial={{ y: "102%" }}
          animate={{ y: show ? "0%" : "102%" }}
          transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1], delay }}
        >
          {text}
        </motion.span>
      </span>
    </span>
  );
}
