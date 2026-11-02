"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { audio } from "@/lib/audio";
import { useScene } from "@/lib/cues";
import type { CueId } from "@/lib/tracks";
import { Slate } from "@/components/cine/Cine";
import styles from "./RecordChange.module.css";

/** Degrees per second at full speed, as on the gate: reads as playing, keeps the print legible. */
const SPIN = 200;
/** Tonearm angles (deg) about its pivot: playing on the old record, at rest off the platter, on the new one's lead-in. */
const ARM = { play: -11, rest: -32, leadIn: -17 };
/** Scroll progress (pinned stage, 0..1) over which the record brakes with sound off. */
const BRAKE: [number, number] = [0.16, 0.32];
/** Scroll progress over which the records change with sound off: the arm lifts, A goes, B drops, the arm returns. */
const CHANGE: [number, number] = [0.32, 0.66];
/** With sound on the change plays in the beat of air between the songs; this long, start to finish (s). */
const SWAP = 0.7;
/** How quickly the drawn speed follows the song's real speed (s). */
const FOLLOW = 0.08;
/** With sound off, how quickly a record spins up or runs down to the speed the scroll asks for (s). */
const MOTOR = 0.3;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Hydrated: false on the server and through hydration, true after (as in Hero and Switch). */
const noop = () => () => {};
const yes = () => true;
const no = () => false;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** 0..1 across [a, b] of `v`, eased in and out. */
const span = (v: number, a: number, b: number) => ease(clamp((v - a) / (b - a)));

/** The two pressings, labelled in our own type. */
const SIDES = {
  a: { cue: "S2" as CueId, title: "Harder Better Faster Stronger", artist: "Daft Punk" },
  b: { cue: "S4" as CueId, title: "Live Your Life", artist: "T.I. ft. Rihanna" },
};

/**
 * How fast a song is really turning, from its deck time: about 1 while it plays, falling through a
 * brake, below 0 in a spinback, 0 once it has stopped. Loop wraps and jumps are skipped.
 */
function useDeckRate() {
  const last = useRef<{ cue: CueId; t: number | null; rate: number }[]>([
    { cue: SIDES.a.cue, t: null, rate: 0 },
    { cue: SIDES.b.cue, t: null, rate: 0 },
  ]);
  return (dt: number) =>
    last.current.map((d) => {
      const t = audio.trackTime(d.cue);
      let raw = 0;
      if (t !== null && d.t !== null && dt > 0.004 && Math.abs(t - d.t) < 0.5) raw = (t - d.t) / dt;
      else if (t !== null && d.t !== null) raw = d.rate;
      d.t = t;
      d.rate += (raw - d.rate) * (1 - Math.exp(-dt / FOLLOW));
      return { audible: t !== null, rate: d.rate };
    });
}

/** The centre label: title along the top, artist along the bottom, and on the new record one ember mark. */
function Label({ title, artist, lit }: { title: string; artist: string; lit: boolean }) {
  const id = useId();
  return (
    <svg className={styles.label} data-lit={lit ? "1" : "0"} viewBox="0 0 200 200">
      <defs>
        <path id={`${id}t`} d="M 34 100 A 66 66 0 0 1 166 100" />
        <path id={`${id}b`} d="M 40 100 A 60 60 0 0 0 160 100" />
      </defs>
      <circle cx="100" cy="100" r="98" className={styles.paper} />
      <circle cx="100" cy="100" r="86" className={styles.rule} />
      <text className={styles.title}>
        <textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">
          {title}
        </textPath>
      </text>
      <text className={styles.artist}>
        <textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">
          {artist}
        </textPath>
      </text>
      {lit && <circle cx="100" cy="62" r="4.5" className={styles.mark} />}
    </svg>
  );
}

/** One record: its shadow on the platter, the turning face (grooves and label), and the room's light on it. */
function Record({
  side,
  angle,
  x,
  y,
  scale,
  opacity,
  shadow,
}: {
  side: "a" | "b";
  angle: MotionValue<number>;
  x: MotionValue<string>;
  y: MotionValue<string>;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
  shadow: MotionValue<number>;
}) {
  const s = SIDES[side];
  return (
    <motion.div className={styles.record} style={{ x, y, scale, opacity }}>
      <motion.span className={styles.shadow} style={{ opacity: shadow }} />
      <motion.div className={styles.face} style={{ rotate: angle }}>
        <Label title={s.title} artist={s.artist} lit={side === "b"} />
      </motion.div>
      <span className={styles.shine} />
    </motion.div>
  );
}

/**
 * SC.05, the record change: the bridge from the work to the person. The B-side's song is on the
 * platter, turning. Scrolling on, the record brakes, the tonearm lifts and swings to its rest, the
 * old record is lifted off, the next one (Live Your Life, labelled in our own type) drops onto the
 * platter, the arm comes back down on its lead-in and it spins up; the line lands, and the portrait
 * follows. With sound on the picture follows the music: each record turns at its song's real speed
 * (so it brakes as the song brakes, and runs backwards in a spinback), and the change itself plays
 * in the beat of air between the two songs. With sound off the scroll drives it all. Reduced
 * motion: the end of the shot, still.
 */
export default function RecordChange() {
  const sectionRef = useRef<HTMLElement>(null);
  useScene(sectionRef, "recordChange");
  // Reduced motion applies once hydrated, so the server's markup (full motion) is what hydration finds.
  const hydrated = useSyncExternalStore(noop, yes, no);
  const prefersReduced = useReducedMotion() ?? false;
  const reduce = hydrated && prefersReduced;
  const { scrollYProgress: p } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  // 0: the old record playing; 1: the new one. Sub-moves are read off it below.
  const change = useMotionValue(0);
  const angleA = useMotionValue(0);
  const angleB = useMotionValue(0);
  const speed = useRef({ a: 1, b: 0, c: 0 });
  const rates = useDeckRate();
  // Reduced motion: the end of the shot, still (set once it applies, after hydration).
  useEffect(() => {
    if (reduce) change.set(1);
  }, [reduce, change]);

  useAnimationFrame((_, ms) => {
    if (reduce) return;
    const dt = Math.min(ms, 64) / 1000;
    const [a, b] = rates(dt);
    const { soundOn, cue } = audio.getState();
    const scored = soundOn && (cue === SIDES.a.cue || cue === SIDES.b.cue || a.audible || b.audible);
    const sp = speed.current;
    const v = p.get();
    if (scored) {
      // Which record is on: the one sounding; in the silence between, the one the score is heading for.
      const target = b.audible ? 1 : a.audible ? 0 : cue === SIDES.b.cue ? 1 : 0;
      const step = dt / SWAP;
      sp.c = target > sp.c ? Math.min(target, sp.c + step) : Math.max(target, sp.c - step);
      // A record that has fallen silent keeps turning on its own momentum for a moment, then stops.
      sp.a = a.audible ? a.rate : sp.a * Math.exp(-dt / 0.12);
      sp.b = b.audible ? b.rate : sp.b * Math.exp(-dt / 0.12);
    } else {
      sp.c = span(v, CHANGE[0], CHANGE[1]);
      const wantA = 1 - span(v, BRAKE[0], BRAKE[1]);
      const wantB = sp.c > 0.92 ? 1 : 0;
      const k = 1 - Math.exp(-dt / MOTOR);
      sp.a += (wantA - sp.a) * k;
      sp.b += (wantB - sp.b) * k;
    }
    change.set(sp.c);
    if (Math.abs(sp.a) > 0.002) angleA.set((angleA.get() + SPIN * sp.a * dt) % 360);
    if (Math.abs(sp.b) > 0.002) angleB.set((angleB.get() + SPIN * sp.b * dt) % 360);
  });

  // The tonearm: lifts, swings out to its rest, waits out the change, swings back over the lead-in, lowers.
  const lift = useTransform(change, (c) => (c < 0.5 ? span(c, 0, 0.16) : 1 - span(c, 0.86, 1)));
  const armAngle = useTransform(change, (c) => {
    const out = span(c, 0.14, 0.38);
    const back = span(c, 0.72, 0.9);
    return ARM.play * (1 - out) + ARM.rest * (out - back) + ARM.leadIn * back;
  });
  const armShadowX = useTransform(lift, (l) => `${6 + l * 16}px`);
  const armShadowY = useTransform(lift, (l) => `${8 + l * 20}px`);
  const armShadowO = useTransform(lift, (l) => 0.55 - l * 0.3);
  const armScale = useTransform(lift, (l) => 1 + l * 0.025);

  // The old record is lifted off and carried out to the left; the new one comes in from above and drops.
  const aOff = useTransform(change, (c) => span(c, 0.3, 0.6));
  const bOn = useTransform(change, (c) => span(c, 0.42, 0.76));
  const aX = useTransform(aOff, (o) => `${-o * 118}%`);
  const aY = useTransform(aOff, (o) => `${-o * 10}%`);
  const aScale = useTransform(aOff, (o) => 1 + Math.sin(Math.min(o * 2.2, 1) * (Math.PI / 2)) * 0.05);
  const aOpacity = useTransform(aOff, (o) => Math.max(0.001, 1 - span(o, 0.55, 1)));
  const aShadow = useTransform(aOff, (o) => 0.9 - Math.min(o * 2.2, 1) * 0.55);
  const bX = useTransform(bOn, (o) => `${(1 - o) * 46}%`);
  const bY = useTransform(bOn, (o) => `${(1 - o) * -64}%`);
  const bScale = useTransform(bOn, (o) => 1 + (1 - o) * 0.07);
  const bOpacity = useTransform(bOn, (o) => Math.max(0.001, span(o, 0, 0.35)));
  const bShadow = useTransform(bOn, (o) => 0.35 + o * 0.55);

  // The line in two halves: the work while its record still turns, the person once the new one is on.
  // The shot steps back a little as the portrait comes up.
  const line1 = useTransform(p, (v) => span(v, 0.05, 0.17));
  const line2 = useTransform(p, (v) => span(v, 0.66, 0.78));
  const line1Y = useTransform(line1, (v) => `${(1 - v) * 0.4}em`);
  const line2Y = useTransform(line2, (v) => `${(1 - v) * 0.4}em`);
  const deckScale = useTransform(p, (v) => 1 - span(v, 0.86, 1) * 0.05);

  return (
    <section ref={sectionRef} id="record-change" className={styles.scene} aria-labelledby="record-change-title">
      <div className={styles.stage}>
        <div className={styles.pool} aria-hidden />
        <motion.div className={styles.deck} style={{ scale: reduce ? 1 : deckScale }} aria-hidden>
          <div className={styles.platter} />
          <Record side="a" angle={angleA} x={aX} y={aY} scale={aScale} opacity={aOpacity} shadow={aShadow} />
          <Record side="b" angle={angleB} x={bX} y={bY} scale={bScale} opacity={bOpacity} shadow={bShadow} />
          <span className={styles.spindle} />
          <motion.div className={styles.arm} style={{ rotate: armAngle }}>
            <motion.svg
              className={styles.armShadow}
              viewBox="0 0 100 100"
              style={{ x: armShadowX, y: armShadowY, opacity: armShadowO }}
            >
              <path d="M 96 6 L 90 40 L 76 62 L 72.6 66.6" />
            </motion.svg>
            <motion.svg className={styles.armBody} viewBox="0 0 100 100" style={{ scale: armScale }}>
              <path d="M 97.6 -2.5 L 96 6" className={styles.weight} />
              <circle cx="96" cy="6" r="4.2" className={styles.base} />
              <path d="M 96 6 L 90 40 L 76 62" className={styles.tube} />
              <path d="M 76 62 L 72.6 66.6" className={styles.head} />
              <circle cx="96" cy="6" r="1.4" className={styles.pin} />
            </motion.svg>
          </motion.div>
        </motion.div>

        <h2 id="record-change-title" className={styles.line}>
          <motion.span className={styles.part} style={{ opacity: reduce ? 1 : line1, y: reduce ? 0 : line1Y }}>
            That&rsquo;s the work.
          </motion.span>{" "}
          <motion.span className={styles.part} style={{ opacity: reduce ? 1 : line2, y: reduce ? 0 : line2Y }}>
            Now, the person behind it.
          </motion.span>
        </h2>
        <Slate scene="SC.05" label="Record change" className={styles.slate} />
      </div>
    </section>
  );
}
