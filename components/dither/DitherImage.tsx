"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useInView, type MotionValue } from "motion/react";
import type { Hover } from "./DitherCanvas";
import styles from "./DitherImage.module.css";

// three.js and React Three Fiber arrive with the canvas, after the page is up, not in its first load.
const DitherCanvas = dynamic(() => import("./DitherCanvas"), { ssr: false });

type Props = {
  src: string;
  /** Source image width / height. */
  aspect: number;
  /** "audio": the music feeds a Doom-style fire; burning dots take its colours, the rest stay grey. "still": a quiet, breathing screen. */
  mode?: "audio" | "still";
  /** Cover-fit focus point in image uv (0..1, y up). */
  focus?: [number, number];
  /** Dots across; defaults to 92 (56 on narrow surfaces). */
  cells?: number;
  /** 0..1 scale for every dot; drive it from scroll to build or dissolve the image. */
  grow?: MotionValue<number>;
  /** Accessible description of the image; omit for decorative use. */
  alt?: string;
  className?: string;
};

/**
 * A photograph redrawn as a dot screen. One canvas, rendering only while within 200px
 * of the viewport. Size it with CSS (it fills its box); the box, and its description, are
 * there before the canvas loads.
 */
export default function DitherImage({ src, aspect, mode = "still", focus = [0.5, 0.52], cells, grow, alt, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const hover = useRef<Hover>({ x: 0.5, y: 0.5, on: 0 });
  const inView = useInView(box, { margin: "200px 0px 200px 0px" });

  return (
    <div
      ref={box}
      className={`${styles.box} ${className ?? ""}`}
      role={alt ? "img" : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        hover.current.x = (e.clientX - r.left) / r.width;
        hover.current.y = 1 - (e.clientY - r.top) / r.height;
        hover.current.on = 1;
      }}
      onPointerLeave={() => (hover.current.on = 0)}
    >
      <DitherCanvas src={src} aspect={aspect} mode={mode} focus={focus} cells={cells} grow={grow} hover={hover} inView={inView} />
    </div>
  );
}
