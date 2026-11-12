"use client";

import { m, useInView } from "motion/react";
import { useRef, type ElementType, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Common = {
  as?: ElementType;
  id?: string;
  className?: string;
  /** Override the in-view trigger, for sequences that start on cue. */
  when?: boolean;
  delay?: number;
  /** Starting offset as a share of the line height. */
  from?: string;
};

function useTrigger(when: boolean | undefined) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  return { ref, show: when ?? inView };
}

/**
 * Lines that rise out of a mask, one after another. Use when the line breaks
 * are part of the design (headlines); use Words for running text.
 */
export function Lines({
  lines,
  id,
  as: Tag = "div",
  className,
  lineClassName,
  when,
  delay = 0,
  stagger = 0.09,
  from = "110%",
}: Common & { lines: ReactNode[]; lineClassName?: string; stagger?: number }) {
  const { ref, show } = useTrigger(when);
  return (
    <Tag ref={ref} id={id} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <m.span
            className={`block ${lineClassName ?? ""}`}
            initial={{ y: from }}
            animate={show ? { y: "0%" } : { y: from }}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * stagger }}
          >
            {line}
          </m.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Running text that arrives word by word. The sentence is kept whole for
 * assistive technology; the animated copy is hidden from it.
 */
export function Words({
  text,
  as: Tag = "p",
  className,
  when,
  delay = 0,
  stagger = 0.014,
  from = "105%",
}: Common & { text: string; stagger?: number }) {
  const { ref, show } = useTrigger(when);
  const words = text.split(" ");
  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-top">
            <m.span
              className="inline-block"
              initial={{ y: from }}
              animate={show ? { y: "0%" } : { y: from }}
              transition={{ duration: 0.9, ease: EASE, delay: delay + i * stagger }}
            >
              {word}
            </m.span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** A plain fade-and-settle for supporting elements. */
export function Fade({
  children,
  as: Tag = "div",
  className,
  when,
  delay = 0,
  y = 16,
}: Omit<Common, "from" | "as"> & {
  children: ReactNode;
  y?: number;
  as?: "div" | "p" | "span" | "ul" | "li" | "dl";
}) {
  const { ref, show } = useTrigger(when);
  const MotionTag = m[Tag] as typeof m.div;
  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, y }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}
