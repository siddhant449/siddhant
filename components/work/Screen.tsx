"use client";

import Image from "next/image";
import Link from "next/link";
import { ViewTransition, useMemo, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { easeInOut, easeOut, motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import type { CaseStudy, Frame } from "@/lib/content";
import { ANATOMY, callouts, layerTransform, PLANE_H, PLANE_W, pose, type Layer } from "./anatomy";
import { Count, Phone, SCREEN_SIZES, Toolbar, vars } from "./parts";
import { chapterProgress, CHAPTERS, EXPLODED, LANDED, PHONES } from "./timeline";
import styles from "./Screen.module.css";

const near = (k: number) => [k - 1, k, k + 1].filter((n) => n >= 0 && n < CHAPTERS);

/**
 * The screen's glow for a chapter: its master at 64px, saturated and already blurred (with a
 * feathered margin), baked by the same process as the layers. Drawing it needs no filter.
 */
const glowOf = (src: string) => src.replace("/img/work/", "/img/work/glow/").replace(/\.jpg$/, ".webp");

type Props = {
  study: CaseStudy;
  /** The project's body progress, 0..1. */
  q: MotionValue<number>;
  /** The chapter scroll has reached: -1 while the hero is exploded, then 0..5. */
  chapter: number;
  /** The click push: the key frame comes up and the screen leans in before the case study opens. */
  pushing: boolean;
  /** Mount the exploded hero's layers (desktop, once the reel is near). */
  layers: boolean;
  onOpen: (e: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * The screen: a flat, front-on browser frame with the site in it, crisp and in the DOM. Six
 * chapters play in page order as the project scrolls, cross-fading with a small upward drift
 * and pushing in slowly while each holds. Behind it, a tiny blurred copy of the current
 * chapter glows onto the set, so the light changes with the work. The hero first arrives as
 * its exploded layers and folds flat into chapter 01; in the last beat the frame steps back
 * for the phones. The whole screen opens the case study (the CTA is its accessible twin).
 */
export default function Screen({ study, q, chapter, pushing, layers, onOpen }: Props) {
  const shown = pushing ? 0 : chapter;
  // Only the chapters either side of the one scroll is on decode; a push also brings up the key frame.
  const mounted = useMemo(() => [...new Set([...near(chapter), ...(shown >= 0 ? [shown] : [])])].sort((a, b) => a - b), [chapter, shown]);
  const cq = useTransform(q, chapterProgress);
  const fold = useTransform(q, [EXPLODED, LANDED], [0, 1], { ease: easeInOut });
  const back = useTransform(q, [PHONES, PHONES + 0.07], [0, 1], { ease: easeInOut });
  const scale = useTransform(back, [0, 1], [1, 0.82]);
  const x = useTransform(back, [0, 1], ["0%", "-2%"]);

  // The chip follows the cursor on a spring, starting from wherever the pointer came in.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const cx = useSpring(px, { stiffness: 320, damping: 30, mass: 0.5 });
  const cy = useSpring(py, { stiffness: 320, damping: 30, mass: 0.5 });
  const point = (e: PointerEvent<HTMLAnchorElement>, jump: boolean) => {
    if (e.pointerType !== "mouse") return;
    const { offsetX, offsetY } = e.nativeEvent;
    px.set(offsetX);
    py.set(offsetY);
    if (jump) {
      cx.jump(offsetX);
      cy.jump(offsetY);
    }
  };

  const caption = Math.max(0, shown);

  return (
    <motion.div className={styles.group} style={{ ...vars({ "--cq": cq, "--fold": fold }), scale, x }} data-pushing={pushing ? "1" : "0"} data-landed={shown >= 0 ? "1" : "0"}>
      <div className={styles.screen}>
        <div className={styles.glow} aria-hidden>
          {mounted.map((k) => (
            <Image key={k} src={glowOf(study.frames[k].src)} alt="" width={80} height={52} className={styles.glowImg} data-on={k === shown ? "1" : "0"} />
          ))}
        </div>

        <div className={styles.lift}>
          <div className={styles.bezel}>
            <Toolbar host={study.host} />
          </div>
          {layers && <Exploded layers={ANATOMY[study.slug] ?? []} fold={fold} />}
          <div className={styles.picture}>
            {mounted.map((k) => (
              <Shot key={k} frame={study.frames[k]} k={k} shown={shown} slug={study.slug} />
            ))}
          </div>
          <Link
            href={`/work/${study.slug}`}
            className={styles.hit}
            tabIndex={-1}
            aria-hidden
            onClick={onOpen}
            onPointerEnter={(e) => point(e, true)}
            onPointerMove={(e) => point(e, false)}
          >
            <motion.span className={styles.chip} style={{ x: cx, y: cy }}>
              Open case study <span aria-hidden>→</span>
            </motion.span>
          </Link>
        </div>
      </div>

      <div className={styles.under} aria-hidden>
        <p key={caption} className={styles.caption}>
          <Count n={caption + 1} />
          <span className={styles.captionText}>{study.frames[caption].caption}</span>
        </p>
        <ol className={styles.progress}>
          {study.frames.map((f, k) => (
            <li key={f.src} style={{ "--k": k } as CSSProperties} data-done={k < shown ? "1" : "0"}>
              <i />
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
}

/** One chapter on the screen. Chapter 01 is the key frame: it shares its name with the case-study hero. */
function Shot({ frame, k, shown, slug }: { frame: Frame; k: number; shown: number; slug: string }) {
  const on = k === shown;
  const shot = (
    <div className={styles.shot} style={{ "--k": k } as CSSProperties} data-state={on ? "on" : k < shown ? "before" : "after"}>
      <Image src={frame.src} alt={on ? frame.alt : ""} fill sizes={SCREEN_SIZES} quality={85} className={styles.img} />
    </div>
  );
  if (k !== 0) return shot;
  return (
    <ViewTransition name={`work-${slug}`} share="morph" default="none">
      {shot}
    </ViewTransition>
  );
}

/**
 * The hero, taken apart: its real layers stacked isometrically with hairline leaders to what
 * each one holds, folding flat (fold 0 → 1) into exactly the picture chapter 01 shows.
 */
function Exploded({ layers, fold }: { layers: Layer[]; fold: MotionValue<number> }) {
  const marks = useMemo(() => callouts(layers), [layers]);
  return (
    <div className={styles.stack} aria-hidden>
      {layers.map((l, i) => (
        <Plane key={l.id} layer={l} i={i} count={layers.length} fold={fold} />
      ))}
      <svg className={styles.leaders} viewBox={`0 0 ${PLANE_W} ${PLANE_H}`} preserveAspectRatio="none">
        {marks.map((m) => (
          <g key={m.id}>
            <line x1={m.anchor[0]} y1={m.anchor[1]} x2={m.label[0] - 1.2} y2={m.label[1]} vectorEffect="non-scaling-stroke" />
            <circle cx={m.anchor[0]} cy={m.anchor[1]} r={0.55} />
          </g>
        ))}
      </svg>
      {marks.map((m) => (
        <p key={m.id} className={styles.callout} style={{ left: `${m.label[0]}em`, top: `${m.label[1]}em` }}>
          <span className={styles.calloutName}>
            <b>{m.n}</b>
            {m.name}
          </span>
          {m.detail && <span className={styles.calloutDetail}>{m.detail}</span>}
        </p>
      ))}
    </div>
  );
}

function Plane({ layer, i, count, fold }: { layer: Layer; i: number; count: number; fold: MotionValue<number> }) {
  const transform = useTransform(fold, (f) => layerTransform(pose(f, count), i));
  return (
    <motion.div className={styles.plane} style={{ transform, backgroundColor: layer.color }} data-ground={layer.color ? "1" : "0"}>
      {layer.src && <Image src={layer.src} alt="" fill sizes={SCREEN_SIZES} className={styles.planeImg} />}
    </motion.div>
  );
}

/** One of the two phones that rise in for the last beat, the second a moment after the first. */
export function RisingPhone({ frame, j, q }: { frame: Frame; j: number; q: MotionValue<number> }) {
  const start = PHONES + 0.01 + j * 0.03;
  const y = useTransform(q, [start, start + 0.08], ["110%", "0%"], { ease: easeOut });
  const opacity = useTransform(q, [start, start + 0.05], [0, 1]);
  return (
    <motion.div className={styles.phone} style={{ y, opacity }} data-j={j}>
      <Phone frame={frame} sizes="300px" />
    </motion.div>
  );
}
