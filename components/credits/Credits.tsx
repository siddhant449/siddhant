"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from "motion/react";
import DitherImage from "@/components/dither/DitherImage";
import { KeyVeil, Slate } from "@/components/cine/Cine";
import { useNarrow } from "@/components/bside/useNarrow";
import { audio, useDirector } from "@/lib/audio";
import { timeline } from "@/lib/content";
import { sceneIs, useScene, useSceneIs } from "@/lib/cues";
import { keyLight, useKeyFrames, type Key } from "@/lib/keylight";
import CallSheet from "./CallSheet";
import EndCard from "./EndCard";
import styles from "./Credits.module.css";

const BIO =
  "Ahmedabad engineer Siddhant Kotak works both ends of the web. By day he builds the systems hospitals and traders lean on: row-level security, publish/subscribe pipelines, model ensembles. The rest of the time goes into interfaces like this one, where the type, the motion and the sound are all part of the build.";

/** The lit pillar edge in the photograph (image uv, y down): the camera's pivot and the key light's mark. */
const EDGE = { u: 0.15, v: 0.42 };
/** The opening extreme close-up: the dot screen at 2.5×, pivoting on the pillar edge. */
const CLOSE_SCALE = 2.5;

/** easeInOutSine: the pull starts and lands softly under Lenis. */
const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/*
 * Light stops on `keyP`: 0..0.2 while the section rises into view, 0.2..0.35 across the pull-back,
 * 0.35..1 across the end card (the iris runs over end card progress 0.05 → 0.42).
 */
function keyFrames(o: { x: number; y: number }): [number, Partial<Key>][] {
  const close: Partial<Key> = { ...o, r: 52, d: 0.46, w: 0.95 };
  const medium: Partial<Key> = { ...o, r: 95, d: 0.3, w: 0.7 };
  const sliver: Partial<Key> = { ...o, r: 2, d: 1, w: 0.8 };
  return [
    [0, { x: o.x, y: Math.min(o.y + 0.55, 1), r: 30, d: 0.5, w: 0.85 }],
    [0.2, close],
    [0.35, medium],
    [0.35 + 0.65 * 0.05, medium],
    [0.35 + 0.65 * 0.42, sliver],
    [1, sliver],
  ];
}

/** The same interpolation as useKeyFrames, for putting the light back after the call sheet borrowed it. */
function sample(frames: [number, Partial<Key>][], p: number): Partial<Key> {
  let i = 0;
  while (i < frames.length - 1 && p > frames[i + 1][0]) i++;
  const [p0, a] = frames[i];
  const [p1, b] = frames[Math.min(i + 1, frames.length - 1)];
  const t = p1 === p0 ? 0 : Math.min(Math.max((p - p0) / (p1 - p0), 0), 1);
  const out: Partial<Key> = {};
  for (const k of Object.keys({ ...a, ...b }) as (keyof Key)[]) {
    const va = a[k] ?? b[k]!;
    const vb = b[k] ?? va;
    out[k] = va + (vb - va) * t;
  }
  return out;
}

/** What is scoring the portrait right now, or an invitation to turn the sound on. */
function NowPlaying({ opacity }: { opacity: MotionValue<number> }) {
  const { cue, soundOn } = useDirector();
  const track = audio.track(cue);
  return (
    <motion.p className={styles.caption} style={{ opacity }}>
      <span className="dot" aria-hidden />
      {soundOn && track ? (
        <span>
          Now playing <span className={styles.captionTitle}>{track.title}</span>, {track.artist}
        </span>
      ) : (
        <span>Turn the sound on and the portrait draws the song.</span>
      )}
    </motion.p>
  );
}

/** The key light while the credits score the page: a leaf, so a change of scene re-renders this alone. */
function CreditsLight({ keyP, frames, swung }: { keyP: MotionValue<number>; frames: [number, Partial<Key>][]; swung: boolean }) {
  useKeyFrames(keyP, frames, useSceneIs("credits") && !swung);
  return null;
}

/**
 * SC.06, credits, scored by Live Your Life. The film opens where the hero ended: an extreme
 * close-up of the dot-screen portrait's lit pillar edge, the dots big as coins. As the bio rises
 * the camera pulls back on that edge to the medium framing, which holds beside the bio, the call
 * sheet and the timeline. Then the key closes to a glint, an iris closes the frame, and the black
 * end card carries the last line and the contact.
 */
export default function Credits() {
  const ref = useRef<HTMLElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useScene(ref, "credits");

  const reduce = useReducedMotion() ?? false;
  const narrow = useNarrow();

  const { scrollYProgress: enter } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const { scrollYProgress: end } = useScroll({ target: endRef, offset: ["start end", "end end"] });
  // Desktop: the frame is pinned; hold the close-up a beat, then pull back as the bio rises into place.
  const { scrollYProgress: pullWide } = useScroll({ target: leadRef, offset: ["0.15 start", "end 0.16"] });
  // Phones: the portrait scrolls with the page; pull back as it rises from the lower half to the top.
  const { scrollYProgress: pullNarrow } = useScroll({ target: frameRef, offset: ["start 0.62", "start 0.12"] });
  const pull = narrow ? pullNarrow : pullWide;

  // Zoom in log space so the pull-back reads at an even speed.
  const scale = useTransform(pull, (p) => Math.pow(CLOSE_SCALE, 1 - ease(Math.min(Math.max(p, 0), 1))));
  const captionIn = useTransform(pullWide, [0.72, 1], [0, 1]);
  // DitherImage maps hover against its unscaled box, so the zoomed canvas sits out of pointer play.
  const zoomRef = useRef<HTMLDivElement>(null);
  useMotionValueEvent(scale, "change", (s) => {
    const el = zoomRef.current;
    if (el) el.dataset.zoomed = s > 1.01 ? "1" : "0";
  });

  // The light's mark is the pillar edge, measured from layout (the frame moves with --margin and --span).
  const [edge, setEdge] = useState({ x: 0.08, y: 0.33 });
  useEffect(() => {
    const measure = () => {
      const film = filmRef.current;
      const frame = frameRef.current;
      if (!film || !frame || !film.offsetWidth || !film.offsetHeight) return;
      const w = frame.offsetWidth;
      const h = w / (1374 / 1145);
      const x = (frame.offsetLeft + w * EDGE.u) / film.offsetWidth;
      const y = (frame.offsetTop + h * EDGE.v) / film.offsetHeight;
      setEdge((e) => (Math.abs(e.x - x) < 0.001 && Math.abs(e.y - y) < 0.001 ? e : { x, y }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (filmRef.current) ro.observe(filmRef.current);
    if (frameRef.current) ro.observe(frameRef.current);
    return () => ro.disconnect();
  }, []);

  const frames = useMemo(() => (reduce ? [[0, keyFrames(edge)[2][1]] as [number, Partial<Key>]] : keyFrames(edge)), [edge, reduce]);

  // One monotonic progress for the light: arriving, pulling back, then closing down with the iris.
  const keyP = useTransform([enter, pull, end], ([a, b, c]: number[]) => a * 0.2 + b * 0.15 + c * 0.65);

  // The call sheet borrows the key light while a row or production is lit; give it back where scroll wants it.
  const [swung, setSwung] = useState(false);
  const onSwing = useCallback(
    (on: boolean) => {
      setSwung(on);
      if (!on && sceneIs("credits")) keyLight.set(sample(frames, keyP.get()));
    },
    [frames, keyP],
  );
  // The call sheet may borrow the light only while the credits score the page, on desktop, in motion.
  const lightable = useCallback(() => sceneIs("credits") && !reduce && !narrow, [reduce, narrow]);

  // Iris out: a matte in the page black (var(--black)) whose circular opening closes on the pillar edge.
  // The #000 below is only the mask's alpha; the matte's colour is its CSS background.
  const iris = useTransform(end, [0.05, 0.42], [150, 0]);
  const matte = useMotionTemplate`radial-gradient(circle ${iris}vmax at var(--iris-x) var(--iris-y), transparent 97%, #000 100%)`;
  const matteShown = useTransform(end, (v) => (v > 0.04 ? "visible" : "hidden"));
  // Once the iris has closed, the portrait is parked off screen so its canvas stops rendering.
  const filmX = useTransform(end, (v) => (v > 0.46 ? "-400vw" : "0vw"));

  return (
    <section ref={ref} id="about" className={styles.section} aria-labelledby="about-title">
      <CreditsLight keyP={keyP} frames={frames} swung={swung} />
      <div className={styles.reel}>
        <motion.div ref={filmRef} className={styles.film} style={{ x: filmX }}>
          <div ref={frameRef} className={styles.frame}>
            <div className={styles.lens}>
              {/* The scale goes on the canvas itself (via --s): R3F sizes its canvas from its container's
                  transformed bounds, so transforming an ancestor would compound the zoom. Reduced motion
                  and the server render the same markup; CSS holds the medium framing there. */}
              <motion.div
                ref={zoomRef}
                className={styles.zoom}
                style={{ "--s": scale } as unknown as MotionStyle}
                data-zoomed="1"
              >
                <DitherImage
                  src="/img/mist.jpg"
                  aspect={1374 / 1145}
                  mode="audio"
                  alt="Siddhant Kotak, seated on a concrete ledge in low light"
                  className={styles.portrait}
                />
              </motion.div>
            </div>
            <NowPlaying opacity={captionIn} />
          </div>
          <div className={styles.flag} aria-hidden />
          <KeyVeil />
        </motion.div>

        <div className={styles.grid}>
          <div ref={leadRef} className={styles.lead} aria-hidden />
          <div className={styles.text}>
            <Slate scene="SC.06" label="Credits" className={styles.slate} />
            <h2 id="about-title" className="label">
              <span className="dot" />
              Siddhant Kotak
            </h2>
            <p className={`big big--indent ${styles.bio}`}>{BIO}</p>

            <CallSheet lightable={lightable} onSwing={onSwing} />

            <div className={styles.timelineBlock} data-timeline>
              <h3 className="label">
                <span className="dot" />
                Timeline
              </h3>
              <ol className={styles.timeline}>
                {timeline.map((t) => (
                  <li key={t.what}>
                    <span className={styles.when}>{t.when}</span>
                    <span className={styles.what}>{t.what}</span>
                    <span className={styles.where}>{t.where}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <EndCard trackRef={endRef} progress={end} />
      </div>

      <motion.div
        className={styles.matte}
        style={{ maskImage: matte, WebkitMaskImage: matte, visibility: matteShown }}
        aria-hidden
      />
    </section>
  );
}
