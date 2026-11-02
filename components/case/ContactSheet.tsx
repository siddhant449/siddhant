"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { CaseStudy } from "@/lib/content";
import styles from "./ContactSheet.module.css";

/**
 * A hand-drawn loop around a frame (viewBox 200×134, the frame sits at x 14–186, y 13–121).
 * It starts above the frame, runs clockwise, nicks the corners and overshoots its start, the
 * way a grease pencil does.
 */
const LOOP =
  "M 60 8 C 120 3, 197 14, 196 60 C 199 112, 186 135, 104 132 C 30 133, 1 122, 4 70 C 2 22, 28 2, 88 6 C 112 5, 136 7, 152 14";
/** A second, lighter pass down the right side: where the hand pressed harder. */
const PRESS = "M 186 24 C 199 40, 201 72, 198 94 C 194 120, 170 136, 122 135";

const EASE = [0.6, 0, 0.25, 1] as const;

/** The grease-pencil circle; it draws once the circled frame is fully in view. */
function GreasePencil() {
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.75 });
  const reduce = useReducedMotion();
  const drawn = seen || !!reduce;
  // Round caps leave a dot at pathLength 0, so the stroke also stays hidden until it starts.
  const stroke = (duration: number, delay: number) =>
    reduce
      ? { duration: 0 }
      : { pathLength: { duration, delay, ease: EASE }, opacity: { duration: 0.01, delay } };

  return (
    <svg ref={ref} className={styles.pencil} viewBox="0 0 200 134" aria-hidden>
      <defs>
        <filter id="grease-wax" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#grease-wax)">
        <motion.path
          d={LOOP}
          className={styles.stroke}
          strokeWidth={1.7}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={drawn ? { pathLength: 1, opacity: 0.95 } : undefined}
          transition={stroke(1.25, 0)}
        />
        <motion.path
          d={PRESS}
          className={styles.stroke}
          strokeWidth={0.9}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={drawn ? { pathLength: 1, opacity: 0.7 } : undefined}
          transition={stroke(0.5, 0.3)}
        />
      </g>
    </svg>
  );
}

/**
 * The six frames as a darkroom contact sheet: one dark strip with sprocket holes, frame
 * numbers in condensed figures, and the key frame circled in grease pencil.
 */
export default function ContactSheet({ study }: { study: CaseStudy }) {
  return (
    <section className={styles.section} aria-labelledby="case-sheet">
      <h2 id="case-sheet" className="label">
        <span className="dot" />
        Contact sheet
      </h2>
      <div className={styles.sheet}>
        <p className={styles.edge} aria-hidden>
          <span>{study.code}</span>
          <span>{study.host}</span>
        </p>
        <ol className={styles.grid}>
          {study.frames.map((f, i) => (
            <li key={f.n} className={styles.cell} data-key={i === study.keyFrame || undefined}>
              <figure className={styles.frame}>
                <div className={styles.box}>
                  <div className={styles.print}>
                    <Image src={f.src} alt={f.alt} fill sizes="(max-width: 800px) 46vw, 31vw" className={styles.img} />
                  </div>
                  {i === study.keyFrame && <GreasePencil />}
                </div>
                <figcaption className={styles.caption}>
                  <span className={styles.n}>{f.n}</span>
                  <span>{f.caption}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
