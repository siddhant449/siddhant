"use client";

import { m, useInView } from "motion/react";
import { useRef, type ElementType, type ReactNode } from "react";

/* The system's three curves. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_REVEAL = [0.18, 0.66, 0.18, 1] as const;
export const EASE_INOUT = [0.76, 0, 0.24, 1] as const;

function useOnce<T extends Element>(when?: boolean, margin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, margin: margin as never });
  return { ref, show: when ?? inView };
}

/**
 * Heading lines that rise out of a mask, one after another, once.
 * Pass each line as its own node so the breaks are designed, not wrapped.
 */
export function Rise({
  lines,
  as: Tag = "h2",
  id,
  className,
  delay = 0,
  when,
}: {
  lines: ReactNode[];
  as?: ElementType;
  id?: string;
  className?: string;
  delay?: number;
  when?: boolean;
}) {
  const { ref, show } = useOnce<HTMLElement>(when);
  return (
    <Tag ref={ref} id={id} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <m.span
            className="block"
            initial={{ y: "104%" }}
            animate={show ? { y: "0%" } : { y: "104%" }}
            transition={{ duration: 0.9, ease: EASE_REVEAL, delay: delay + i * 0.08 }}
          >
            {line}
          </m.span>
        </span>
      ))}
    </Tag>
  );
}

/** Supporting elements: a short fade and a 12px settle, once. */
export function Fade({
  children,
  as = "div",
  className,
  delay = 0,
  when,
}: {
  children: ReactNode;
  as?: "div" | "p" | "span" | "ul" | "li" | "dl" | "article" | "nav";
  className?: string;
  delay?: number;
  when?: boolean;
}) {
  const { ref, show } = useOnce<HTMLDivElement>(when);
  const Tag = m[as] as typeof m.div;
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </Tag>
  );
}

/** Images and media open upward from their bottom edge, once. */
export function Unveil({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, show } = useOnce<HTMLDivElement>(undefined, "0px 0px -8% 0px");
  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      animate={show ? { clipPath: "inset(0% 0% 0% 0%)" } : { clipPath: "inset(100% 0% 0% 0%)" }}
      transition={{ duration: 1, ease: EASE_REVEAL, delay }}
    >
      {children}
    </m.div>
  );
}

/**
 * The row that opens every section: its name on the left, a short note or
 * note on the right, over a rule that draws across.
 */
export function Opener({ label, meta, className }: { index?: string; label: string; meta?: ReactNode; className?: string }) {
  const { ref, show } = useOnce<HTMLDivElement>();
  return (
    <div ref={ref} className={`relative flex items-baseline justify-between gap-6 pb-3.5 ${className ?? ""}`}>
      <m.p
        className="t-label"
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        {label}
      </m.p>
      {meta ? (
        <m.p
          className="t-label mute text-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: show ? 1 : 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
        >
          {meta}
        </m.p>
      ) : null}
      <m.span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-current opacity-40"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: show ? 1 : 0 }}
        transition={{ duration: 0.9, ease: EASE_REVEAL }}
      />
    </div>
  );
}
