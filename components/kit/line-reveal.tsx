"use client";

import { useInView } from "motion/react";
import { useRef, type CSSProperties, type ElementType } from "react";
import { cssEase, LINE_REVEAL } from "@/lib/kit/motion";
import { useLoaded } from "@/lib/kit/use-loaded";
import styles from "./kit.module.css";

type Segment = { readonly text: string; readonly italic?: boolean };

/**
 * Dennis Snellenberg's masked reveal: every word rises out of its own mask,
 * 800ms power3.out, 10ms apart, once, when the heading enters the view.
 * Pass `text`, or `segments` when some words are the italic accent.
 */
export function LineReveal({
  as: Tag = "h2",
  text,
  segments,
  className,
  id,
  delay = 0,
  when,
}: {
  as?: ElementType;
  text?: string;
  segments?: readonly Segment[];
  className?: string;
  id?: string;
  /** ms before the first word */
  delay?: number;
  /** drive it yourself instead of on view */
  when?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const loaded = useLoaded();
  const show = when ?? (inView && loaded);
  const parts: Segment[] = segments ? [...segments] : [{ text: text ?? "" }];

  let i = 0;
  const words = parts.flatMap((seg, s) =>
    seg.text
      .split(/(\s+)/)
      .filter(Boolean)
      .map((w, k) => {
        if (/^\s+$/.test(w)) return " ";
        const index = i++;
        return (
          <span key={`${s}-${k}`} className={styles.mask}>
            <span className={styles.word} style={{ "--i": index } as CSSProperties}>
              {seg.italic ? <em className="t-it">{w}</em> : w}
            </span>
          </span>
        );
      }),
  );

  const vars = {
    "--kit-dur": `${LINE_REVEAL.duration}ms`,
    "--kit-ease": cssEase(LINE_REVEAL.ease),
    "--kit-stagger": `${LINE_REVEAL.stagger}ms`,
    "--kit-delay": `${delay}ms`,
  } as CSSProperties;

  return (
    <Tag ref={ref} id={id} className={`${styles.lines} ${className ?? ""}`} style={vars} data-in={show ? "" : undefined}>
      {words}
    </Tag>
  );
}
