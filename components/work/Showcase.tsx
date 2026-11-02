"use client";

import { useRef } from "react";
import { useScene } from "@/lib/cues";
import Reel from "./Reel";
import Sheet from "./Sheet";
import Stacked from "./Stacked";
import { useMedia } from "./parts";
import styles from "./Showcase.module.css";

/**
 * SC.03, the A-side: the web-design work, kept flat, front-on and crisp, with the cinema
 * around it rather than on it. On a desktop screen it is a pinned reel (Reel.tsx): the hook
 * as a title card, then one stage per project that slides over the last. Phones and short
 * screens get each project as a stacked block; reduced motion gets a still contact sheet.
 * One section element for every mode, so the scene registry keeps its node (Daft Punk stays on).
 */
export default function Showcase() {
  const ref = useRef<HTMLElement>(null);
  useScene(ref, "aSide");
  const roomy = useMedia("(min-width: 1024px) and (min-height: 640px)");
  const still = useMedia("(prefers-reduced-motion: reduce)");

  return (
    <section ref={ref} id="a-side" className={styles.section}>
      {!roomy ? <Stacked /> : still ? <Sheet /> : <Reel />}
    </section>
  );
}
