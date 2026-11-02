"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { person } from "@/lib/content";
import { useScene, useSceneIs } from "@/lib/cues";
import { useKeyFrames, type Key } from "@/lib/keylight";
import { Slate } from "@/components/cine/Cine";
import { SLIT_HAIR } from "@/components/hero/timing";
import { DISSOLVE, TIMELINE, fieldLoop, type BeatShape, type View, type WordBox } from "./switch/field";
import styles from "./Switch.module.css";

const FieldScene = dynamic(() => import("./switch/FieldScene"), { ssr: false });

/** Entry progress at which the stage has pinned: the cut out of the hero's last frame. */
const PINNED = 0.999;

/** The hero's line, answered one layer at a time. Every fact is from lib/content.ts. */
const LAYERS = [
  {
    word: "Interface",
    label: "The interface",
    lines: ["This site: WebGL shaders, a dot-screen renderer and a two-deck Web Audio director, in Next.js and React Three Fiber."],
  },
  {
    word: "Systems",
    label: "The systems behind it",
    lines: [
      "A hospital messenger: a REST API, a Socket.IO gateway fanned out over Redis, and Service Bus workers on 13 topics.",
      "Row-level security forced on 34 tables.",
    ],
  },
  {
    word: "AI",
    label: "The AI in it",
    lines: ["Visual search at 85%+ accuracy with sub-second responses, across 15+ FastAPI services.", "Financial sentiment on 19,200+ articles a day."],
  },
  {
    word: "Cloud",
    label: "The cloud it runs on",
    lines: ["Shipped as one container image on Azure Container Apps, with secrets in Key Vault and sign-in through Entra ID."],
  },
];

/** The key light rests on the slit, then follows the type across the frame. */
const KEYS: [number, Partial<Key>][] = [
  [0, { x: 1 / 6, y: 0.5, r: 14, d: 0.9, w: 0.9 }],
  [0.12, { x: 0.36, y: 0.42, r: 40, d: 0.75, w: 0.7 }],
  [1, { x: 0.32, y: 0.5, r: 36, d: 0.8, w: 0.6 }],
];

const noop = () => () => {};
const yes = () => true;
const no = () => false;

/** A beat's DOM text fades in as its dots arrive and out as they leave. */
const shownFor = (beat: number, lead = 0.01, fade = 0.035) => {
  const { at, until } = TIMELINE[beat];
  return [
    [at + lead - fade, at + lead, until - fade * 0.5, until + fade * 0.5],
    [0, 1, 1, 0],
  ] as const;
};

/** Type the dots draw: real text (what is read, and what the field samples), set in per-word spans. */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className={styles.w} data-w="">
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function Fade({ q, beat, className, children, lead }: { q: MotionValue<number>; beat: number; className: string; children: ReactNode; lead?: number }) {
  const [input, output] = shownFor(beat, lead);
  const opacity = useTransform(q, [...input], [...output]);
  const y = useTransform(opacity, (v) => `${(1 - v) * 10}px`);
  return (
    <motion.div className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

/** One word box as the stage lays it out: where it sits, and the font the page draws it in. */
function boxOf(el: HTMLElement, origin: DOMRect): WordBox {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    text: (el.textContent ?? "").trim(),
    left: r.left - origin.left,
    top: r.top - origin.top,
    width: r.width,
    height: r.height,
    font: { family: cs.fontFamily, weight: cs.fontWeight, size: parseFloat(cs.fontSize), stretch: cs.fontStretch, letterSpacing: parseFloat(cs.letterSpacing) || 0 },
  };
}

/**
 * The A-side title card's words, where they will stand once the card has pinned: measured against
 * its sticky stage (pinned at the top of the viewport), or the section itself where the A-side is
 * a plain stack (phones).
 */
function titleWords(): WordBox[] {
  const line = document.querySelector<HTMLElement>("#a-side h2[data-lyric]");
  if (!line) return [];
  let stage: HTMLElement | null = line.parentElement;
  while (stage && stage.id !== "a-side" && getComputedStyle(stage).position !== "sticky") stage = stage.parentElement;
  const origin = (stage ?? line).getBoundingClientRect();
  return Array.from(line.querySelectorAll<HTMLElement>(":scope > span")).map((el) => boxOf(el, origin));
}

/**
 * SC.02, the pitch. It lies under the hero's exit and appears on a cut as its stage pins, on the
 * frame the hero ends on: black, and the pillar's light narrowed to a slit. Out of that slit a
 * field of dots streams into type, "The whole product.", and then answers the hero's line one
 * layer at a time: each layer's word in dots, two lines of proof beside it in plain text. The
 * dots scatter under the pitch, gather into "Here's the work.", and come to rest on the A-side
 * title card's own words; the stage stays over the A-side until the card has pinned underneath,
 * then cuts to it, type to type. Scroll scrubs it; the cursor parts the dots. The hero's song
 * plays on under it, with no lyric. Reduced motion: the same text, still, and no dots.
 */
export default function Switch() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const beatsRef = useRef<HTMLDivElement>(null);
  useScene(sectionRef, "switch");
  // Reduced motion takes over only after hydration, so the server's HTML and the first render agree.
  const hydrated = useSyncExternalStore(noop, yes, no);
  const prefersReduced = useReducedMotion() ?? false;
  const reduce = hydrated && prefersReduced;
  const active = useSceneIs("switch");
  const near = useInView(sectionRef, { margin: "60% 0px 60% 0px" });
  // Reduced motion: no pin, so the scene fades in (200ms) once it is well on screen.
  const arrived = useInView(stageRef, { amount: 0.2 });
  const { scrollYProgress: q } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // 0 → 1 as the section's top rises from the bottom of the viewport to the top: 1 once the stage has pinned.
  const { scrollYProgress: entry } = useScroll({ target: sectionRef, offset: ["start end", "start start"] });
  useKeyFrames(q, KEYS, active && !reduce);

  // Shown on a cut the moment it pins; at the end it dissolves onto the title card, whose words
  // the dots are standing on, and is gone once the card has pinned underneath it.
  const stageAlpha = useTransform([entry, q] as MotionValue<number>[], ([e, p]: number[]) => {
    if (e < PINNED || p >= 0.999) return 0;
    const t = Math.min(1, Math.max(0, (p - DISSOLVE[0]) / (DISSOLVE[1] - DISSOLVE[0])));
    return 1 - t * t * (3 - 2 * t);
  });
  const stagePointer = useTransform(stageAlpha, (v) => (v > 0.5 ? "auto" : "none"));
  // A function, not keyframes: motion can't hand it to the compositor, so the slit and its hairline
  // are painted in place like the hero's (a composited 1px line at a half pixel renders brighter).
  const slitAlpha = useTransform(q, (v) => Math.max(0, 1 - v / 0.05));
  const eyebrow = useTransform(q, [0.03, 0.08, 0.14, 0.17], [0, 1, 1, 0]);
  const [pitchIn, pitchOut] = shownFor(6, 0, 0.04);
  const pitchShown = useTransform(q, [...pitchIn], [...pitchOut]);
  // The two links stay in the tab order throughout; they take the pointer only while they show.
  const ctaPointer = useTransform(pitchShown, (v) => (v > 0.5 ? "auto" : "none"));

  // Tabbing onto a link while its beat is off screen brings the pitch up first.
  const lenis = useLenis();
  const toPitch = () => {
    const section = sectionRef.current;
    if (reduce || !section || pitchShown.get() > 0.5) return;
    const { at, until } = TIMELINE[6];
    const y = section.getBoundingClientRect().top + window.scrollY + ((at + until) / 2) * (section.offsetHeight - window.innerHeight);
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };

  // The field draws every frame only while the stage is up: flipped straight from the scroll.
  const run = useCallback(() => {
    fieldLoop.running = !reduce && near && entry.get() >= PINNED && q.get() < 0.999;
  }, [reduce, near, entry, q]);
  useMotionValueEvent(entry, "change", run);
  useMotionValueEvent(q, "change", run);
  useEffect(() => {
    run();
    return () => {
      fieldLoop.running = false;
    };
  }, [run]);

  // The type the dots form, measured from the page once per layout (never in a frame): this
  // section's words, and the title card's. Fonts are loaded first, so the samples match the type.
  const [layout, setLayout] = useState<{ view: View; shapes: BeatShape[] } | null>(null);
  useEffect(() => {
    if (reduce) return;
    const stage = stageRef.current;
    const beats = beatsRef.current;
    if (!stage || !beats) return;
    let alive = true;
    let last = "";
    const measure = () => {
      const section = sectionRef.current;
      if (!alive || !section) return;
      const origin = stage.getBoundingClientRect();
      const phone = window.matchMedia("(max-width: 800px)").matches;
      const margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--margin")) || 16;
      const words = (beat: string) => Array.from(beats.querySelectorAll<HTMLElement>(`[data-beat="${beat}"] [data-w]`)).map((el) => boxOf(el, origin));
      const handoff = words("handoff");
      const title = titleWords();
      const shapes: BeatShape[] = [
        { words: words("opener") },
        ...LAYERS.map((l) => ({ words: words(l.word) })),
        { field: true },
        { words: handoff },
        // The title card's words, each as lit as the card shows it, so the dissolve is unseen.
        title.length ? { words: title, lit: true } : { words: handoff },
      ];
      const pinAt = Math.round(section.getBoundingClientRect().top + window.scrollY + section.offsetHeight - window.innerHeight);
      const view = { width: window.innerWidth, height: window.innerHeight, pillar: phone ? margin : window.innerWidth / 6, phone, pinAt };
      // Rebuilt only when the type has actually moved: never for a change elsewhere on the page.
      const key = JSON.stringify([view, shapes]);
      if (key === last) return;
      last = key;
      setLayout({ view, shapes });
    };
    const family = getComputedStyle(beats).fontFamily;
    void Promise.all([document.fonts.load(`condensed 800 100px ${family}`), document.fonts.load(`extra-condensed 800 100px ${family}`)])
      .catch(() => {})
      .then(() => document.fonts.ready)
      .then(measure);
    // The stage is the viewport; the title card's line moves only with the A-side's own layout.
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    const title = document.querySelector("#a-side h2[data-lyric]");
    if (title) ro.observe(title);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [reduce]);

  return (
    <section ref={sectionRef} id="the-switch" className={styles.scene} aria-labelledby="pitch-title">
      <motion.div ref={stageRef} className={styles.stage} style={reduce ? { opacity: arrived ? 1 : 0 } : { opacity: stageAlpha, pointerEvents: stagePointer }}>
        <div className={styles.canvas} aria-hidden>
          {!reduce && near && layout && <FieldScene q={q} view={layout.view} shapes={layout.shapes} />}
        </div>
        <motion.div className={styles.slit} style={{ scaleX: SLIT_HAIR, opacity: slitAlpha }} aria-hidden />
        <motion.div className={styles.hair} style={{ opacity: slitAlpha }} aria-hidden />

        <div ref={beatsRef} className={styles.beats}>
          <div className={`${styles.beat} ${styles.opener}`} data-beat="opener">
            <motion.p className={`label ${styles.eyebrow}`} style={reduce ? undefined : { opacity: eyebrow }}>
              <span className="dot" />
              Siddhant Kotak, full-stack and AI engineer, Ahmedabad
            </motion.p>
            <h2 id="pitch-title" className={styles.word}>
              <Words text="The whole product." />
            </h2>
          </div>

          {LAYERS.map((layer, i) => (
            <div key={layer.word} className={`${styles.beat} ${styles.layer}`} data-beat={layer.word}>
              <h3 className={`${styles.word} ${styles.big}`}>
                <Words text={layer.word} />
              </h3>
              {reduce ? (
                <Proof n={i + 1} label={layer.label} lines={layer.lines} />
              ) : (
                <Fade q={q} beat={i + 2} className={styles.proofWrap}>
                  <Proof n={i + 1} label={layer.label} lines={layer.lines} />
                </Fade>
              )}
            </div>
          ))}

          <motion.div className={`${styles.beat} ${styles.pitch}`} style={reduce ? undefined : { opacity: pitchShown }}>
            <p className={styles.pitchLine}>Bring me the problem. I’ll own it from the first screen to the last deploy.</p>
            <motion.div className={styles.ctas} style={reduce ? undefined : { pointerEvents: ctaPointer }} onFocus={toPitch}>
              <p className={styles.status}>
                <span className={`dot ${styles.live}`} aria-hidden />
                Available for new projects
              </p>
              <a className={styles.cta} href={`mailto:${person.email}`}>
                Email me
              </a>
              <a className={styles.cta} href={person.resume} target="_blank" rel="noreferrer">
                Résumé (PDF)
              </a>
            </motion.div>
          </motion.div>

          <div className={`${styles.beat} ${styles.handoff}`} data-beat="handoff">
            <p className={styles.word}>
              <Words text="Here’s the work." />
            </p>
          </div>
        </div>

        <div className={styles.slate}>
          <Slate scene="SC.02" label="The pitch" />
        </div>
      </motion.div>
    </section>
  );
}

function Proof({ n, label, lines }: { n: number; label: string; lines: string[] }) {
  return (
    <div className={styles.proof}>
      <p className={styles.layerLabel}>
        <span className={styles.num}>{String(n).padStart(2, "0")}</span>
        {label}
      </p>
      {lines.map((line) => (
        <p key={line} className={styles.line}>
          {line}
        </p>
      ))}
    </div>
  );
}
