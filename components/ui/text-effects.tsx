"use client";

import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

function ScrollWord({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <m.span style={{ opacity }} className="inline">
      {word}
    </m.span>
  );
}

/** A paragraph read as you scroll: each word comes up to full strength in turn. */
export function ScrollRead({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={i}>
            <ScrollWord word={word} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </p>
  );
}
