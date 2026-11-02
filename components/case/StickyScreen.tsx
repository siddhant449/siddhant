"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { motion, useInView, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import type { CaseStudy } from "@/lib/content";
import styles from "./StickyScreen.module.css";

/** The pin holds the first and last frames for a beat on either side of the scroll-through. */
const RUN: [number, number] = [0.08, 0.92];

/**
 * A browser frame pinned in one-point perspective, raked by the key light from the left,
 * with the six frames scrolling through it as the visitor scrolls the pin. Reduced motion
 * (handled in CSS) unpins it and shows the frames as a plain stacked list in the frame.
 */
export default function StickyScreen({ study }: { study: CaseStudy }) {
  const ref = useRef<HTMLElement>(null);
  const count = study.frames.length;

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // The column is `count` frames tall; moving it up by (count - 1) / count lands the last one.
  const y = useTransform(scrollYProgress, RUN, ["0%", `${(-100 * (count - 1)) / count}%`]);

  const [current, setCurrent] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const t = (p - RUN[0]) / (RUN[1] - RUN[0]);
    setCurrent(Math.min(count - 1, Math.max(0, Math.round(t * (count - 1)))));
  });

  // Frames clipped inside the screen never intersect the viewport, so lazy loading would only
  // fetch each one as it slides in. Load them all once the pin is near.
  const near = useInView(ref, { once: true, margin: "100% 0px 100% 0px" });

  const frame = study.frames[current];

  return (
    <section
      ref={ref}
      className={styles.screen}
      style={{ "--frames": count } as CSSProperties}
      aria-labelledby="case-screen"
    >
      <div className={styles.stage}>
        <h2 id="case-screen" className={`label ${styles.heading}`}>
          <span className="dot" />
          On screen
        </h2>

        <div className={styles.rig}>
          <div className={styles.floor} aria-hidden>
            <div className={styles.cast} />
          </div>
          <div className={styles.browser}>
            <div className={styles.bar}>
              <span className={styles.lights} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.host}>{study.host}</span>
            </div>
            <div className={styles.viewport}>
              {/* The contact sheet above carries these frames' descriptions. */}
              <motion.div className={styles.column} style={{ y }} aria-hidden>
                {study.frames.map((f) => (
                  <div key={f.n} className={styles.page}>
                    <Image
                      src={f.src}
                      alt=""
                      fill
                      sizes="(max-width: 800px) 92vw, 76vw"
                      loading={near ? "eager" : "lazy"}
                      className={styles.img}
                    />
                  </div>
                ))}
              </motion.div>
            </div>
            <div className={styles.shade} aria-hidden />
            <div className={styles.warm} aria-hidden />
          </div>
        </div>

        <p className={styles.caption} aria-hidden>
          <span className={styles.n}>{frame.n}</span>
          <span>{frame.caption}</span>
        </p>
      </div>
    </section>
  );
}
