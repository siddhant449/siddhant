"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { motion, useInView, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useLenis } from "lenis/react";
import { Slate } from "@/components/cine/Cine";
import LyricLine from "@/components/cine/LyricLine";
import { aSide, type CaseStudy } from "@/lib/content";
import { useLyricHold } from "@/lib/hold";
import { Ctas, HINT, ProjectCopy, useOpen, vars } from "./parts";
import { activeAt, BODY, chapterAt, chapterProgress, CHAPTERS, clamp, HOLD, localT, OVERLAP, SLIDE, STEP, TITLE_TRACK, trackHeight } from "./timeline";
import Screen, { RisingPhone } from "./Screen";
import styles from "./Reel.module.css";

const COUNT = aSide.length;

/** An index jump scrolls across chapters: the screens hold still until it lands, so nothing flickers past. */
type Travel = { on: boolean; landed: Set<() => void>; timer: number };

/** How long the index glide takes (s). */
const GLIDE = 1.3;

const take = (i: number) => `TK.${String(i + 1).padStart(2, "0")}`;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The pinned desktop reel. A short title card holds the hook; then each project gets its own
 * pinned stage, and each stage slides up over the last like a stack of cards. The project
 * index stays put on top of the stack, and every stage carries the project's copy and its
 * calls to action beside the screen.
 */
export default function Reel() {
  const titleRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: titleP } = useScroll({ target: titleRef, offset: ["start end", "end end"] });
  const { scrollYProgress: p } = useScroll({ target: reelRef, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(p, "change", (v) => setActive(activeAt(v, COUNT)));

  // The case studies must be cached before a click commits, or the screen can't morph into the hero.
  const router = useRouter();
  useEffect(() => {
    for (const s of aSide) router.prefetch(`/work/${s.slug}`);
  }, [router]);

  const lenis = useLenis();
  const travel = useRef<Travel>({ on: false, landed: new Set(), timer: 0 });
  // Hidden mid-glide (the case study opened): let go, so the screens play again on return.
  useEffect(() => {
    const t = travel.current;
    return () => {
      window.clearTimeout(t.timer);
      t.on = false;
    };
  }, []);

  /** Scroll position where project i's stage has just landed, its hero still exploded. */
  const landing = useCallback((i: number) => {
    const el = reelRef.current;
    if (!el) return null;
    return el.getBoundingClientRect().top + window.scrollY + ((i * STEP + SLIDE) / 100) * window.innerHeight;
  }, []);

  /** The index: glide to a project, holding the screens still on the way. */
  const travelTo = useCallback(
    (i: number) => {
      const y = landing(i);
      if (y === null) return;
      const t = travel.current;
      const land = () => {
        window.clearTimeout(t.timer);
        if (!t.on) return;
        t.on = false;
        t.landed.forEach((fn) => fn());
      };
      if (!lenis) {
        window.scrollTo(0, y);
        return;
      }
      t.on = true;
      // The wheel is held for the glide so it can't be cut short; the timer lets go whatever happens.
      lenis.scrollTo(y, { duration: GLIDE, easing: easeInOutCubic, force: true, lock: true, onComplete: land });
      window.clearTimeout(t.timer);
      t.timer = window.setTimeout(land, GLIDE * 1000 + 250);
    },
    [landing, lenis],
  );

  /** Keyboard focus on another project's call to action cuts straight to its stage. */
  const jumpTo = useCallback(
    (i: number) => {
      if (i === active) return;
      const y = landing(i);
      if (y === null) return;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    },
    [active, landing, lenis],
  );

  return (
    <>
      <TitleCard trackRef={titleRef} progress={titleP} />
      <div ref={reelRef} className={styles.reel} style={{ marginTop: `-${OVERLAP}svh` }}>
        <IndexLayer p={p} active={active} onPick={travelTo} />
        {aSide.map((study, i) => (
          <Track key={study.slug} study={study} i={i} p={p} travel={travel} onFocusCtas={jumpTo} />
        ))}
      </div>
    </>
  );
}

/** Where the title card pins, and where A1 starts to slide over it, as shares of its track's progress. */
const TITLE_PIN = 100 / TITLE_TRACK;
const TITLE_COVER = (100 + HOLD) / TITLE_TRACK;
/** Sound off, the words light by scroll while the card is pinned on its own. */
const TITLE_WINDOW: [number, number] = [TITLE_PIN + 0.02, TITLE_COVER - 0.02];

/**
 * The hook as a title card: "Work it, make it, do it, makes us", lit as it is sung (or as you
 * scroll). The line counts as on screen only while the card is pinned and not yet covered, so
 * nothing lights before it has arrived; scrolling down onto it with sound on, the page lands on
 * the pinned card and holds while the line is sung (lib/hold.ts).
 */
function TitleCard({ trackRef, progress }: { trackRef: RefObject<HTMLDivElement | null>; progress: MotionValue<number> }) {
  useLyricHold(trackRef, "workIt");
  // progress runs over the whole track: arriving (100), alone (HOLD), then covered by A1 (SLIDE).
  const cover = useTransform(progress, [TITLE_COVER, 1], [0, 1]);
  const presence = useTransform(progress, (v) => (v >= TITLE_PIN - 0.002 ? 1 - clamp((v - TITLE_COVER) / (1 - TITLE_COVER)) : 0));
  const scale = useTransform(cover, [0, 1], [1, 0.94]);
  const shade = useTransform(cover, [0, 1], [0, 0.7]);
  return (
    <div ref={trackRef} className={styles.titleTrack} style={{ height: `${TITLE_TRACK}svh` }}>
      <div className={styles.titleStage}>
        <motion.div className={styles.titleCard} style={{ scale }}>
          <LyricLine lineId="workIt" as="h2" fallback={progress} window={TITLE_WINDOW} presence={presence} className={styles.lyric} />
          <Slate scene="SC.03" take="TK.01" label="A-side" className={styles.titleSlate} />
        </motion.div>
        <motion.div className={styles.shade} style={{ opacity: shade }} aria-hidden />
      </div>
    </div>
  );
}

/** The project index: on top of the whole stack, so it stays put while the stages slide under it. */
function IndexLayer({ p, active, onPick }: { p: MotionValue<number>; active: number; onPick: (i: number) => void }) {
  // It arrives with A1's stage, then holds.
  const y = useTransform(p, (v) => `${(1 - clamp(localT(v, 0, COUNT) / SLIDE)) * 100}%`);
  return (
    <motion.nav className={styles.indexLayer} style={{ y }} aria-label="A-side projects">
      <ol className={styles.index}>
        {aSide.map((study, i) => (
          <IndexItem key={study.slug} study={study} i={i} p={p} active={active === i} onPick={onPick} />
        ))}
      </ol>
    </motion.nav>
  );
}

function IndexItem({ study, i, p, active, onPick }: { study: CaseStudy; i: number; p: MotionValue<number>; active: boolean; onPick: (i: number) => void }) {
  const cq = useTransform(p, (v) => chapterProgress(clamp((localT(v, i, COUNT) - SLIDE) / BODY)));
  return (
    <li>
      <motion.button
        type="button"
        className={styles.item}
        style={vars({ "--cq": cq })}
        data-active={active ? "1" : "0"}
        aria-current={active ? "true" : undefined}
        onClick={() => onPick(i)}
      >
        <span className={styles.thumb}>
          <Image src={study.frames[0].src} alt="" width={144} height={90} sizes="72px" />
        </span>
        <span className={styles.itemText}>
          <span className={styles.itemCode}>{study.code}</span>
          <span className={styles.itemTitle}>{study.title}</span>
          <span className={styles.ticks} aria-hidden>
            {Array.from({ length: CHAPTERS }, (_, k) => (
              <i key={k} style={{ "--k": k } as CSSProperties} />
            ))}
          </span>
        </span>
      </motion.button>
    </li>
  );
}

type TrackProps = {
  study: CaseStudy;
  i: number;
  p: MotionValue<number>;
  travel: RefObject<Travel>;
  onFocusCtas: (i: number) => void;
};

/**
 * One project's track: a 100svh stage pinned while it scrolls. The stage slides up over the
 * one before (SLIDE), plays the project (BODY), and, if another follows, holds while that one
 * slides over it, stepping back into the dark.
 */
function Track({ study, i, p, travel, onFocusCtas }: TrackProps) {
  const ref = useRef<HTMLElement>(null);
  const t = useTransform(p, (v) => localT(v, i, COUNT));
  const y = useTransform(t, (v) => `${(1 - clamp(v / SLIDE)) * 100}%`);
  const q = useTransform(t, [SLIDE, SLIDE + BODY], [0, 1]);
  const cover = useTransform(t, [STEP, STEP + SLIDE], [0, 1]);
  const scale = useTransform(cover, [0, 1], [1, 0.94]);
  const shade = useTransform(cover, [0, 1], [0, 0.7]);

  const [chapter, setChapter] = useState(() => chapterAt(q.get()));
  useMotionValueEvent(q, "change", (v) => {
    if (!travel.current.on) setChapter(chapterAt(v));
  });
  useEffect(() => {
    const landed = travel.current.landed;
    const sync = () => setChapter(chapterAt(q.get()));
    landed.add(sync);
    return () => {
      landed.delete(sync);
    };
  }, [q, travel]);

  const { pushing, onClick } = useOpen(study.slug);
  // The exploded hero's layers load once the reel is near, and stay.
  const near = useInView(ref, { once: true, margin: "100% 0px 100% 0px" });
  const headingId = `a-side-${study.slug}`;

  return (
    <article
      ref={ref}
      className={styles.track}
      style={{ height: `${trackHeight(i, COUNT)}svh`, marginTop: `-${i ? OVERLAP : 100}svh`, zIndex: i + 1 }}
      aria-labelledby={headingId}
    >
      <motion.div className={styles.stage} style={{ y }}>
        <motion.div className={styles.card} style={{ scale }}>
          <Slate scene="SC.03" take={take(i)} label="A-side" className={styles.slate} />
          <div className={styles.copyCol}>
            <ProjectCopy study={study} headingId={headingId} />
            <Ctas study={study} onOpen={onClick} onFocus={() => onFocusCtas(i)} className={styles.ctas} />
            <p className={styles.hint}>{HINT}</p>
          </div>
          <div className={styles.screenCol}>
            <Screen study={study} q={q} chapter={chapter} pushing={pushing} layers={near} onOpen={onClick} />
          </div>
          {/* The phones load once the reel is two chapters away from them. */}
          {chapter >= CHAPTERS - 2 && (
            <div className={styles.phones}>
              {study.mobile.map((m, j) => (
                <RisingPhone key={m.src} frame={m} j={j} q={q} />
              ))}
            </div>
          )}
          <ul className="sr-only" aria-label={`${study.title}: the site, chapter by chapter`}>
            {[...study.frames, ...study.mobile].map((f) => (
              <li key={f.src}>
                {f.caption}: {f.alt}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div className={styles.shade} style={{ opacity: shade }} aria-hidden />
      </motion.div>
    </article>
  );
}
