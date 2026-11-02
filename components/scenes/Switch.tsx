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
import { DISSOLVE, FADE_IN, FADE_OUT, TIMELINE, fieldLoop, stretchKeyword, type BeatShape, type View, type WordBox } from "./switch/field";
import styles from "./Switch.module.css";

const FieldScene = dynamic(() => import("./switch/FieldScene"), { ssr: false });

/** Entry progress at which the stage has pinned: the cut out of the hero's last frame. */
const PINNED = 0.999;

/** The hero's line, answered one domain at a time: what the dots spell, and what is said under it. */
type ToolGroup = { label: string; items: string[] };
/** `under`: the word spans the frame, the text beneath it. `beside`: a short word, the text to its right. */
type Domain = { word: string; layout: "under" | "beside"; sub: string; text: string; tools: ToolGroup[] };
const DOMAINS: Domain[] = [
  {
    word: "Interface",
    layout: "under",
    sub: "Design and front end",
    text: "I design the interface and build it myself, so nothing is lost between the idea and the browser: layout, type and motion that stay fast and accessible, and WebGL, shaders and sound when a page should feel like more than a page.",
    tools: [{ label: "Tools", items: ["React 19", "Next.js", "TypeScript", "Tailwind CSS", "TanStack Query", "Vite", "Motion", "three.js", "React Three Fiber", "GLSL", "Web Audio", "Vitest"] }],
  },
  {
    word: "System design",
    layout: "under",
    sub: "Architecture that holds",
    text: "Multi-tenant platforms with clear boundaries: stateless APIs, realtime gateways that scale out, publish/subscribe with dead-letter queues and bounded retries, idempotent consumers and exactly-once delivery, lease-based leader election, and tenant isolation enforced in the database itself.",
    tools: [{ label: "Tools", items: ["Kafka", "RabbitMQ", "Azure Service Bus", "Redis", "Socket.IO", "PostgreSQL", "Celery"] }],
  },
  {
    word: "Full-stack",
    layout: "under",
    sub: "From the schema to the screen",
    text: "One owner across the stack: data models, typed APIs and the interfaces on top of them, with validation, shared types and tests end to end, in monorepos that keep many packages in step.",
    tools: [
      {
        label: "Tools",
        items: ["TypeScript", "JavaScript", "Python", "Java", "SQL", "Node.js", "Express 5", "FastAPI", "Drizzle", "Knex", "Zod", "PostgreSQL", "MongoDB", "Turborepo", "Pytest"],
      },
    ],
  },
  {
    word: "AI",
    layout: "beside",
    sub: "Models inside products",
    text: "AI that ships inside a product rather than a notebook: machine learning and deep learning models, RAG pipelines over embeddings and vector search, LLMs and vision models wired into real features, ensembles that score risk with explanations people can check, and MLOps that retrains them on schedule.",
    tools: [
      {
        label: "Tools",
        items: ["PyTorch", "Hugging Face", "LangChain", "pgvector", "OpenCLIP", "Sentence Transformers", "GPT-4o", "XGBoost", "scikit-learn", "FinBERT", "MLflow", "Optuna", "SHAP", "LIME", "Elasticsearch", "Pandas", "NumPy"],
      },
    ],
  },
  {
    word: "Cloud",
    layout: "beside",
    sub: "Shipped, watched and kept running",
    text: "Containerised services on Azure and AWS, built and shipped through CI/CD with infrastructure as code, private networking and secrets in a vault, sign-in through the cloud’s identity provider, and metrics, logs and error tracking so problems surface before users notice.",
    tools: [
      { label: "Azure", items: ["Container Apps", "Service Bus", "Blob Storage", "Key Vault", "Entra ID", "API Management", "Azure Monitor"] },
      { label: "AWS", items: ["EC2", "S3", "Lambda", "ECS"] },
      { label: "Delivery", items: ["Docker", "Terraform", "GitHub Actions", "Nginx", "Vercel"] },
      { label: "Observability", items: ["Prometheus", "Grafana", "Sentry", "ELK"] },
    ],
  },
];


/** Where each beat sits in the timeline (field.ts): the slit, the opener, the domains, the pitch, the handoff. */
const OPENER = 1;
const FIRST_DOMAIN = 2;
const PITCH = FIRST_DOMAIN + DOMAINS.length;

/** The key light rests on the slit, then follows the type across the frame. */
const KEYS: [number, Partial<Key>][] = [
  [0, { x: 1 / 6, y: 0.5, r: 14, d: 0.9, w: 0.9 }],
  [0.12, { x: 0.36, y: 0.42, r: 40, d: 0.75, w: 0.7 }],
  [1, { x: 0.32, y: 0.5, r: 36, d: 0.8, w: 0.6 }],
];

const noop = () => () => {};
const yes = () => true;
const no = () => false;

/** A beat's DOM text fades in over the last of its dots' arrival, holds through the plateau, and goes as they leave. */
const shownFor = (beat: number) => {
  const { at, until } = TIMELINE[beat];
  return [
    [at - FADE_IN, at, until, until + FADE_OUT],
    [0, 1, 1, 0],
  ] as const;
};

const pad = (n: number) => String(n).padStart(2, "0");

let inkCtx: CanvasRenderingContext2D | null = null;

/**
 * Sizes each dot word to the room it has: as wide as its column, and no taller than what the stage
 * has left once the text with it is laid out (or a share of the viewport, `data-cap`). On phones a
 * line of several words may break, a word to a line, when that sets it much larger. All reads come
 * first, then the writes (`--fit` on each word), once per layout and never in a frame.
 */
function fitWords(beats: HTMLElement, phone: boolean) {
  inkCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = inkCtx;
  if (!ctx) return;
  const vh = window.innerHeight;
  const sizes = Array.from(beats.querySelectorAll<HTMLElement>("[data-fit]")).map((el) => {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
    ctx.fontStretch = stretchKeyword(cs.fontStretch);
    ctx.letterSpacing = `${((parseFloat(cs.letterSpacing) || 0) / size) * 100}px`;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const words = text.split(" ");
    const em = (t: string) => ctx.measureText(t).width / 100;
    const whole = em(text);
    const longest = Math.max(...words.map(em));
    const lh = parseFloat(cs.lineHeight) / size || 0.9;
    const width = el.clientWidth * 0.97;
    // The room it has: the rest of its beat beside the text, or below it, or a share of the viewport.
    const beat = el.closest<HTMLElement>("[data-beat]");
    const about = beat?.querySelector<HTMLElement>("[data-about]");
    const beside = !phone && beat?.dataset.layout === "beside";
    const gap = beat ? parseFloat(getComputedStyle(beat).rowGap) || 0 : 0;
    const room = about && beat && !beside ? beat.clientHeight - about.getBoundingClientRect().height - gap : beat ? beat.clientHeight : vh;
    const cap = parseFloat((phone ? el.dataset.capPhone : el.dataset.cap) ?? "0.4") * vh;
    const one = Math.min(width / whole, room / lh, cap);
    const broken = phone && words.length > 1 ? Math.min(width / longest, room / (words.length * lh), cap) : 0;
    return Math.max(32, broken > one * 1.15 ? broken : one);
  });
  beats.querySelectorAll<HTMLElement>("[data-fit]").forEach((el, i) => el.style.setProperty("--fit", `${sizes[i].toFixed(1)}px`));
}

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

function Fade({ q, beat, className, children }: { q: MotionValue<number>; beat: number; className: string; children: ReactNode }) {
  const [input, output] = shownFor(beat);
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
 * domain at a time: each domain's word in dots, and under it in plain text what the domain covers
 * and the tools it is done with. The
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
  // Reduced motion: no pin, so the scene fades in (200ms) once it is well on screen. Its stacked
  // text runs several screens tall, so "well on screen" is its top past the lower 15% of the view.
  const arrived = useInView(stageRef, { margin: "0px 0px -15% 0px" });
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
  const [eyebrowIn, eyebrowOut] = shownFor(OPENER);
  const eyebrow = useTransform(q, [...eyebrowIn], [...eyebrowOut]);
  const [pitchIn, pitchOut] = shownFor(PITCH);
  const pitchShown = useTransform(q, [...pitchIn], [...pitchOut]);
  // The two links stay in the tab order throughout; they take the pointer only while they show.
  const ctaPointer = useTransform(pitchShown, (v) => (v > 0.5 ? "auto" : "none"));

  // Tabbing onto a link while its beat is off screen brings the pitch up first.
  const lenis = useLenis();
  const toPitch = () => {
    const section = sectionRef.current;
    if (reduce || !section || pitchShown.get() > 0.5) return;
    const { at, until } = TIMELINE[PITCH];
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
      // The dot words sized to the frame first; then where they stand is read once.
      fitWords(beats, phone);
      const words = (beat: string) => Array.from(beats.querySelectorAll<HTMLElement>(`[data-beat="${beat}"] [data-w]`)).map((el) => boxOf(el, origin));
      const handoff = words("handoff");
      const title = titleWords();
      const shapes: BeatShape[] = [
        { words: words("opener") },
        ...DOMAINS.map((d) => ({ words: words(d.word) })),
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
      {/* One structure and one set of styles in both modes: reduced motion overrides them in CSS. */}
      <motion.div ref={stageRef} className={styles.stage} style={{ opacity: stageAlpha, pointerEvents: stagePointer }} data-arrived={arrived ? "" : undefined}>
        <div className={styles.canvas} aria-hidden>
          {!reduce && near && layout && <FieldScene q={q} view={layout.view} shapes={layout.shapes} />}
        </div>
        <motion.div className={styles.slit} style={{ scaleX: SLIT_HAIR, opacity: slitAlpha }} aria-hidden />
        <motion.div className={styles.hair} style={{ opacity: slitAlpha }} aria-hidden />

        <div ref={beatsRef} className={styles.beats}>
          <div className={`${styles.beat} ${styles.opener}`} data-beat="opener">
            <motion.p className={`label ${styles.eyebrow}`} style={{ opacity: eyebrow }}>
              <span className="dot" />
              Siddhant Kotak, designer and developer, Ahmedabad
            </motion.p>
            <h2 id="pitch-title" className={styles.word} data-fit="" data-cap="0.3" data-cap-phone="0.4">
              <Words text="The whole product." />
            </h2>
          </div>

          {DOMAINS.map((domain, i) => (
            <div key={domain.word} className={`${styles.beat} ${styles.domain}`} data-beat={domain.word} data-layout={domain.layout}>
              <h3 className={`${styles.word} ${styles.big}`} data-fit="" data-cap={domain.layout === "beside" ? "0.56" : "0.42"} data-cap-phone="0.3">
                <Words text={domain.word} />
              </h3>
              <Fade q={q} beat={FIRST_DOMAIN + i} className={styles.aboutWrap}>
                <About n={i + 1} domain={domain} />
              </Fade>
            </div>
          ))}

          <motion.div className={`${styles.beat} ${styles.pitch}`} style={{ opacity: pitchShown }}>
            <p className={styles.pitchLine}>Bring me the problem. I’ll own it from the first screen to the last deploy.</p>
            <motion.div className={styles.ctas} style={{ pointerEvents: ctaPointer }} onFocus={toPitch}>
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
            <p className={styles.word} data-fit="" data-cap="0.3" data-cap-phone="0.4">
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

/**
 * What a domain covers: where it sits among the five ("02 / 05", and a bar), its subtitle, a
 * paragraph, and the tools it is done with, as quiet pills (in labelled groups where it has them).
 */
function About({ n, domain }: { n: number; domain: Domain }) {
  return (
    <div className={styles.about} data-about="">
      <div className={styles.meta}>
        <p className={styles.progress}>
          <span className="sr-only">
            Domain {n} of {DOMAINS.length}
          </span>
          <span className={styles.count} aria-hidden>
            <span className={styles.num}>{pad(n)}</span> / {pad(DOMAINS.length)}
          </span>
          <span className={styles.bar} aria-hidden>
            {DOMAINS.map((d, k) => (
              <i key={d.word} data-state={k < n - 1 ? "done" : k === n - 1 ? "on" : undefined} />
            ))}
          </span>
        </p>
        <p className={styles.sub}>{domain.sub}</p>
      </div>
      <div className={styles.body}>
        <p className={styles.text}>{domain.text}</p>
        <div className={styles.tools}>
          {domain.tools.map((group) => (
            <div key={group.label} className={styles.group}>
              <p className={styles.toolsLabel}>{group.label}</p>
              <ul className={styles.pills} aria-label={group.label === "Tools" ? `${domain.word} tools` : `${group.label} tools`}>
                {group.items.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
