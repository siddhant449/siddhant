"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion, useScroll, type MotionValue } from "motion/react";
import { Slate } from "@/components/cine/Cine";
import { bSide, hiddenTracks, mangaArt } from "@/lib/content";
import { useScene, useSceneIs } from "@/lib/cues";
import { keyLight, useKeyFrames, useKeyLit, type Key } from "@/lib/keylight";
import MessagingMachine from "./anatomy/MessagingMachine";
import { useNarrow } from "./useNarrow";
import styles from "./BSide.module.css";

const MangaPanels = dynamic(() => import("./MangaPanels"), { ssr: false });

type Stops = [number, Partial<Key>][];
type Item = (typeof bSide)[number];

/**
 * Where the key's pool rests for each beat, in order (viewport fractions, as keyLight.set takes them):
 * on the pillar line beside the title, behind the machine, behind the page, then raking low under the list.
 */
const POOLS: Record<"wide" | "narrow", Partial<Key>[]> = {
  wide: [
    { x: 0.167, y: 0.42, r: 58, d: 0.4, w: 0.55 },
    { x: 0.68, y: 0.46, r: 50, d: 0.45, w: 0.3 },
    { x: 0.32, y: 0.48, r: 50, d: 0.45, w: 0.36 },
    { x: 0.2, y: 0.8, r: 70, d: 0.5, w: 0.22 },
  ],
  narrow: [
    { x: 0.167, y: 0.45, r: 55, d: 0.4, w: 0.5 },
    { x: 0.5, y: 0.38, r: 62, d: 0.45, w: 0.3 },
    { x: 0.5, y: 0.42, r: 62, d: 0.45, w: 0.36 },
    { x: 0.12, y: 0.82, r: 75, d: 0.5, w: 0.2 },
  ],
};

/** Reduced motion parks the key on the pillar line for the whole side. */
const PARKED: Stops = [[0, { x: 0.167, y: 0.45, r: 62, d: 0.45, w: 0.4 }]];

/** The other projects were both built at Demaze Technologies (as the call sheet's productions say). */
const ALSO_WHERE = "Demaze Technologies";

/**
 * The light's stops along the section's pass, which runs from the section's top meeting the bottom
 * of the frame to its bottom leaving the top. The light rests on a beat (an element marked
 * data-beat) while it fills the middle of the frame, and glides to the next as they hand over.
 * Read from layout on resize, never per frame.
 */
function measureStops(section: HTMLElement, pools: Partial<Key>[]): Stops {
  const vh = window.innerHeight;
  const span = section.offsetHeight + vh;
  const stops: Stops = [[0, pools[0]]];
  section.querySelectorAll<HTMLElement>("[data-beat]").forEach((beat, i) => {
    const pool = pools[Math.min(i, pools.length - 1)];
    // Arrives once the beat's top is 30% down the frame; leaves once its bottom has risen to 70%.
    let a = (beat.offsetTop + vh * 0.7) / span;
    let b = (beat.offsetTop + beat.offsetHeight + vh * 0.3) / span;
    if (b < a) a = b = (a + b) / 2;
    const last = stops[stops.length - 1][0];
    stops.push([Math.max(a, last), pool], [Math.max(b, a, last), pool]);
  });
  stops.push([1, stops[stops.length - 1][1]]);
  return stops;
}

/** The key at progress `v` along `stops`, interpolated as useKeyFrames does. */
function keyAt(stops: Stops, v: number): Partial<Key> {
  let i = 0;
  while (i < stops.length - 1 && v > stops[i + 1][0]) i++;
  const [p0, a] = stops[i];
  const [p1, b] = stops[Math.min(i + 1, stops.length - 1)];
  const t = p1 === p0 ? 0 : Math.min(Math.max((v - p0) / (p1 - p0), 0), 1);
  const out: Partial<Key> = {};
  for (const k of Object.keys({ ...a, ...b }) as (keyof Key)[]) {
    const va = a[k] ?? b[k]!;
    const vb = b[k] ?? va;
    out[k] = va + (vb - va) * t;
  }
  return out;
}

/**
 * The manga page's art is CC BY-SA: its licences ask for the author, the source, the licence and
 * a note of the change, so they sit beside the art. Each name links to its source page (title and
 * full terms); the dithered versions are shared under the same licences.
 */
function ArtCredit() {
  const licences = [...new Map(mangaArt.map((a) => [a.license, a.licenseUrl])).entries()];
  return (
    <p className={styles.credit}>
      Art by{" "}
      {mangaArt.map((a, i) => (
        <span key={a.src}>
          <a href={a.page} target="_blank" rel="noreferrer" title={a.title}>
            {a.artist}
          </a>
          {i < mangaArt.length - 2 ? ", " : i === mangaArt.length - 2 ? " and " : ""}
        </span>
      ))}{" "}
      via Wikimedia Commons,{" "}
      {licences.map(([name, url], i) => (
        <span key={name}>
          <a href={url} target="_blank" rel="noreferrer">
            {name}
          </a>
          {i < licences.length - 1 ? " and " : ""}
        </span>
      ))}
      ; dithered and shared under the same licences.
    </p>
  );
}

/**
 * A project's copy: its code and name, the one-line pitch, the body and any closing line, then where
 * it was built and on what. `children` follow the facts (the art credit, beside the art).
 */
function Copy({ item, children }: { item: Item; children?: ReactNode }) {
  return (
    <div className={styles.copy}>
      <p className={`label ${styles.code}`}>
        <span className="dot" />
        {item.code}
      </p>
      <h3 id={`${item.anchor}-title`} className={styles.name}>
        {item.title}
      </h3>
      <p className={styles.line}>{item.line}</p>
      <p className={styles.body}>{item.body}</p>
      {item.close && (
        <p className={styles.close}>
          {item.close.split(/(?<=\.)\s+/).map((sentence) => (
            <span key={sentence}>{sentence}</span>
          ))}
        </p>
      )}
      <dl className={styles.meta}>
        <div>
          <dt>Where</dt>
          <dd>{item.where}</dd>
        </div>
        <div>
          <dt>Stack</dt>
          <dd>{item.stack}</dd>
        </div>
      </dl>
      {children}
    </div>
  );
}

/**
 * SC.04, the B-side: engineering, scored by Harder Better Faster Stronger. Three beats in normal flow, nothing pinned: a
 * title card; the clinical messaging platform as a two-panel bench, its copy and controls beside the
 * working machine, so it can be played without fighting the scroll; and Shizuku's manga page beside
 * its copy, then the other projects as a short list. One key light keeps the mood: its pool, held in
 * the frame, settles behind each beat in turn as the page scrolls.
 */
/**
 * The key light while the B-side scores the page. A leaf of its own, so a change of scene re-renders
 * this alone, never the machine and the manga page with it.
 */
function SideLight({ pass, stops }: { pass: MotionValue<number>; stops: Stops }) {
  const active = useSceneIs("bSide");
  useKeyFrames(pass, stops, active);
  // The side can take over without a scroll (a rail jump lands on it): light it where it stands.
  useEffect(() => {
    if (active) keyLight.set(keyAt(stops, pass.get()));
  }, [active, stops, pass]);
  return null;
}

export default function BSide() {
  const ref = useRef<HTMLElement>(null);
  const atmosRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useScene(ref, "bSide");
  useKeyLit(atmosRef);
  useKeyLit(titleRef);

  const reduce = useReducedMotion() ?? false;
  const narrow = useNarrow();
  const { scrollYProgress: pass } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // The beats move with the viewport's size, and the light's stops with them. The observer's first
  // report, on observe, gives the first measure.
  const [measured, setMeasured] = useState<Stops | null>(null);
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const pools = POOLS[narrow ? "narrow" : "wide"];
    const measure = () => setMeasured(measureStops(section, pools));
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [narrow]);

  const stops = reduce || !measured ? PARKED : measured;

  const [messaging, studio] = bSide;

  return (
    <section ref={ref} id="b-side" className={styles.section} aria-labelledby="b-side-title">
      <SideLight pass={pass} stops={stops} />
      <div ref={atmosRef} className={styles.atmos} aria-hidden />

      <header className={styles.titleCard} data-beat>
        <h2 ref={titleRef} id="b-side-title" className={styles.title}>
          Engineering
        </h2>
        <p className={styles.subtitle}>The systems behind the screens</p>
        <Slate scene="SC.04" label="B-side" className={styles.slate} />
      </header>

      <article id={messaging.anchor} className={styles.bench} data-beat aria-labelledby={`${messaging.anchor}-title`}>
        <MessagingMachine layout="split" lead={<Copy item={messaging} />} />
      </article>

      <article id={studio.anchor} className={styles.studio} data-beat aria-labelledby={`${studio.anchor}-title`}>
        <div className={styles.page}>
          <MangaPanels />
        </div>
        <Copy item={studio}>
          <ArtCredit />
        </Copy>
      </article>

      <aside className={styles.also} data-beat aria-labelledby="also-built">
        <h3 id="also-built" className="label">
          <span className="dot" />
          Also built
        </h3>
        <ul className={styles.alsoList}>
          {hiddenTracks.map((t) => {
            // Each track reads "Name: what it does".
            const cut = t.text.indexOf(": ");
            const what = t.text.slice(cut + 2);
            return (
              <li key={t.n} className={styles.alsoItem}>
                <h4 className={styles.alsoName}>{t.text.slice(0, cut)}</h4>
                <p className={styles.alsoText}>{what.charAt(0).toUpperCase() + what.slice(1)}</p>
                <p className={styles.alsoWhere}>{ALSO_WHERE}</p>
              </li>
            );
          })}
        </ul>
      </aside>
    </section>
  );
}
