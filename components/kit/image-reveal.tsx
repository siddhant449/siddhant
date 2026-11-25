"use client";

import { useInView } from "motion/react";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { cssEase, IMAGE_REVEAL } from "@/lib/kit/motion";
import { useLoaded } from "@/lib/kit/use-loaded";
import styles from "./kit.module.css";

/**
 * Obys' figure reveal: the frame opens from its centre (clip-path inset 50% to 0, 800ms)
 * while the image settles from 1.15 to 1 (1600ms), both expo.out.
 * Give it a size (aspect ratio or height) through className; put a next/image `fill` inside.
 */
export function ImageReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  /* Observe the unclipped wrapper: IntersectionObserver honours clip-path, and inset(50%) has no area. */
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const loaded = useLoaded();
  const show = inView && loaded;
  const vars = {
    "--kit-clip-from": IMAGE_REVEAL.clipFrom,
    "--kit-scale-from": IMAGE_REVEAL.scaleFrom,
    "--kit-clip-dur": `${IMAGE_REVEAL.clipDuration}ms`,
    "--kit-scale-dur": `${IMAGE_REVEAL.scaleDuration}ms`,
    "--kit-ease": cssEase(IMAGE_REVEAL.ease),
    transitionDelay: `${delay}ms`,
  } as CSSProperties;
  return (
    <div ref={ref} className={`${styles.reveal} ${className ?? ""}`} style={vars} data-in={show ? "" : undefined}>
      <div className={styles.revealClip} style={{ transitionDelay: `${delay}ms` }}>
        <div className="absolute inset-0" style={{ transitionDelay: `${delay}ms` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
