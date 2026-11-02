"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { person } from "@/lib/content";
import { useScene, useSceneIs } from "@/lib/cues";
import { PILLAR, useKeyFrames } from "@/lib/keylight";
import { Slate } from "./cine/Cine";
import { heroLoop } from "./hero/loop";
import { HERO_PIN, SLIT_HAIR } from "./hero/timing";
import { useRevealAt } from "@/lib/stage";

const HeroScene = dynamic(() => import("./hero/HeroScene"), { ssr: false });

const meta = [
  { text: "Siddhant Kotak, Ahmedabad, India", indent: 0, kind: "label" },
  { text: "Designer", indent: 1 },
  { text: "Full-stack engineer", indent: 1 },
  { text: "AI developer", indent: 2 },
  { text: "Cloud deployment engineer", indent: 2 },
  {
    text: "I design and build products end to end: the interface, the systems behind it, the AI in it and the cloud it runs on.",
    indent: 0,
    kind: "line",
  },
];

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const linear = (t: number) => t;

const noop = () => () => {};
const yes = () => true;
const no = () => false;

export default function Hero() {
  const revealAt = useRevealAt();
  const ref = useRef<HTMLElement>(null);
  useScene(ref, "hero");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Reduced motion: no pin and no scrubbed exit; the opening frame crossfades away (200ms) as it leaves.
  const reduce = useReducedMotion() ?? false;
  const still = useMotionValue(0);
  const scroll = reduce ? still : scrollYProgress;
  const inView = useInView(ref, { margin: "0px 0px 200px 0px" });
  const present = useInView(ref, { amount: 0.5 });
  // False on the server and through hydration, true after: browser-only state stays out of the server HTML.
  const hydrated = useSyncExternalStore(noop, yes, no);
  const fade = useTransform(scroll, [0, HERO_PIN * 0.3], [1, 0]);
  // Faded out, the overlay is hidden outright, so its link can't be clicked or tabbed to unseen.
  const overlayShown = useTransform(fade, (v) => (v > 0.01 ? "visible" : "hidden"));
  // The exit, 0 → 1 across the pin. The pillar's light widens into a soft full-height blade, then
  // narrows to the slit SC.02 opens on, its hairline coming up as it closes: the match cut.
  const exit = useTransform(scroll, [0, HERO_PIN], [0, 1]);
  const bladeAlpha = useTransform(exit, [0.3, 0.5], [0, 1]);
  const bladeScale = useTransform(exit, [0.3, 0.58, 0.7, 0.97], [SLIT_HAIR, 1, 1, SLIT_HAIR], { ease: [easeOut, linear, easeInOut] });
  const hairAlpha = useTransform(exit, [0.8, 0.97], [0, 1]);
  // Its WebGL draws while it is on screen and revealed, and rests once SC.02 has pinned over its
  // last frame: flipped straight from the scroll, so the cut costs no render.
  const shown = revealAt !== null;
  const run = useCallback(() => {
    heroLoop.running = inView && shown && exit.get() < 1;
  }, [inView, shown, exit]);
  useMotionValueEvent(exit, "change", run);
  useEffect(() => {
    run();
    return () => {
      heroLoop.running = false;
    };
  }, [run]);
  const active = useSceneIs("hero");
  // The key light starts on the pillar edge and narrows to a sliver as the photograph goes dark.
  useKeyFrames(
    scroll,
    [
      [0, PILLAR],
      [HERO_PIN, { ...PILLAR, r: 6, d: 0.95 }],
    ],
    active,
  );

  return (
    <section ref={ref} id="top" className="hero" aria-label="Siddhant Kotak, portfolio">
      <div className="hero__stage" data-gone={hydrated && reduce && !present ? "1" : undefined}>
        <div className="hero__canvas">
          {/* Paused while the gate is up: it's opaque, so nothing drawn behind it is seen. */}
          <HeroScene scroll={scroll} revealAt={revealAt} reduce={reduce} word="SIDDHANT" />
        </div>

        <motion.div className="hero__blade" style={{ scaleX: bladeScale, opacity: bladeAlpha }} aria-hidden />
        <motion.div className="hero__hair" style={{ opacity: hairAlpha }} aria-hidden />

        <h1 className="sr-only">Siddhant Kotak, {person.role}. Portfolio of web design and engineering work.</h1>

        <motion.div className="hero__overlay" style={{ opacity: fade, visibility: overlayShown }}>
          <ul className="hero__meta" aria-label="About Siddhant Kotak">
            {meta.map((m, i) => (
              <motion.li
                key={m.text}
                data-indent={m.indent}
                data-kind={m.kind}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={shown ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
                transition={{ delay: 1.6 + i * 0.08, duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
              >
                {m.text}
              </motion.li>
            ))}
          </ul>
          <motion.p className="hero__side hero__side--l" initial={{ opacity: 0 }} animate={shown ? { opacity: 1 } : undefined} transition={{ delay: 2.2 }}>
            Portfolio
          </motion.p>
          <motion.p className="hero__side hero__side--r" initial={{ opacity: 0 }} animate={shown ? { opacity: 1 } : undefined} transition={{ delay: 2.2 }}>
            01
          </motion.p>
          <motion.div
            className="hero__slate"
            initial={{ opacity: 0 }}
            animate={shown ? { opacity: 1 } : undefined}
            transition={{ delay: 2.4 }}
          >
            <Slate scene="SC.01" label="Cold open" />
          </motion.div>
          <motion.a
            className="hero__corner"
            href={person.github}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0 }}
            animate={shown ? { opacity: 1 } : undefined}
            transition={{ delay: 2.4 }}
          >
            GitHub
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
