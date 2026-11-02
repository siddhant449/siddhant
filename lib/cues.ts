"use client";

import { startTransition, useEffect, useState, type RefObject } from "react";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";
import { audio, type SceneCue } from "./audio";
import { scrollTop } from "./scroll";

export type SceneId = "hero" | "switch" | "aSide" | "bSide" | "recordChange" | "credits" | "case";

export type SceneSpec = SceneCue & {
  code: string;
  label: string;
  /** How the scene rail's card describes the music coming into this scene from the one before. */
  edit?: string;
  /** Where the scene's top must rise to (× viewport height) before it is the sound scene; J_CUT by default. */
  cueAt?: number;
};

/**
 * Every scene and the cue that scores it. Every change of song is a DJ's handover, one song at a
 * time (lib/audio.ts); `mode` is how the scene rail marks the edit.
 */
export const SCENES: Record<SceneId, SceneSpec> = {
  hero: { cue: "S1", mode: "blend", code: "SC.01", label: "Cold open" },
  // SC.02 lies under the hero's exit and opens on a cut out of its last frame: it takes the
  // score as its stage pins. The same song plays on under it, with no lyric.
  switch: { cue: "S1", mode: "blend", cueAt: 0, code: "SC.02", label: "The pitch" },
  // The title card's line: Daft Punk comes in on "Work it" as the card pins, not before.
  aSide: { cue: "S2", mode: "cut", lyric: "workIt", cueAt: 0.02, code: "SC.03", label: "A-side", edit: "Echoes out, then cuts in on the lyric" },
  // From here on, Live Your Life's intro (the larger music-video source) starts loading.
  bSide: { cue: "S2", mode: "blend", preload: "intro", code: "SC.04", label: "B-side" },
  // The bridge from the work to the person: its stage pins, and a sixth of the way in (as the
  // record starts to brake) the score heads for Live Your Life: the record brakes, a beat of air,
  // and the next one drops on its downbeat.
  recordChange: {
    cue: "S4",
    mode: "cut",
    move: "brake",
    preload: "intro",
    cueAt: -0.3,
    code: "SC.05",
    label: "Record change",
    edit: "The record brakes, then the next one drops",
  },
  credits: { cue: "S4", mode: "blend", preload: "intro", code: "SC.06", label: "Credits" },
  case: { cue: "S2", mode: "blend", code: "SC.03", label: "Case study" },
};

/** The home page's scenes, in order: where each starts and what it holds (the scene rail and the footer's tracklist). */
export const REEL: { id: SceneId; href: string; what: string }[] = [
  { id: "hero", href: "#top", what: "The chrome name over the ledge photograph." },
  { id: "switch", href: "#the-switch", what: "The pillar's light turns into type: the whole product, layer by layer, then the first card." },
  { id: "aSide", href: "#a-side", what: "Web-design work: Truvolt Engineering and WebIndia Inc." },
  { id: "bSide", href: "#b-side", what: "Engineering: a clinical messaging platform and Shizuku, documents turned into manga." },
  { id: "recordChange", href: "#record-change", what: "The record changes: from the work to the person." },
  { id: "credits", href: "#about", what: "Portrait, the call sheet and the end card." },
];

/**
 * J-cut: a scene's sound arrives before its picture fills the screen. A scene becomes
 * the sound scene once its top edge rises above this fraction of the viewport height.
 */
const J_CUT = 0.85;
/** A new scene must hold this long (ms) before the score follows it, unless the page is nearly still. */
const DWELL = 350;
/** Below this speed (px/s) the page counts as still, and a scene change is committed at once. */
const STILL = 500;

/** Each scene's element and its top in the document, measured on resize, so a scroll frame reads no layout. */
const registry = new Map<SceneId, { el: HTMLElement; top: number }>();
let active: SceneId | null = null;
const listeners = new Set<() => void>();
let raf = 0;
let lenis: Lenis | null = null;
/** The scene the geometry points at but the score hasn't followed yet, and since when. */
let candidate: SceneId | null = null;
let since = 0;
let dwellTimer = 0;
/** Scroll speed measured between evaluations, for native scrolling (reduced motion has no Lenis). */
let lastY = 0;
let lastAt = 0;
let measured = 0;

function speed(now: number) {
  const y = scrollTop();
  const dt = now - lastAt;
  if (dt > 0) measured = (Math.abs(y - lastY) / dt) * 1000;
  lastY = y;
  lastAt = now;
  // Lenis reports px per frame while it animates, and 0 once it has settled.
  return lenis ? Math.abs(lenis.velocity) * 60 : measured;
}

function commit(next: SceneId) {
  candidate = null;
  window.clearTimeout(dwellTimer);
  active = next;
  audio.enterScene(SCENES[next]);
  listeners.forEach((fn) => fn());
}

/** The next song down the page after the scene in play, loaded ahead on the idle deck so its cut lands on time. */
function prepareAfter(tops: [SceneId, number][]) {
  if (!active) return;
  const cue = SCENES[active].cue;
  const here = tops.find(([id]) => id === active)?.[1] ?? 0;
  const next = tops
    .filter(([id, top]) => top > here && SCENES[id].cue !== cue)
    .sort((a, b) => a[1] - b[1])[0];
  if (next) audio.prepare(SCENES[next[0]].cue);
}

function evaluate() {
  raf = 0;
  if (!registry.size) return;
  const vh = window.innerHeight;
  let next: SceneId | null = null;
  let nextTop = -Infinity;
  let first: SceneId | null = null;
  let firstTop = Infinity;
  const tops: [SceneId, number][] = [];
  const y = scrollTop();
  for (const [id, scene] of registry) {
    const top = scene.top - y;
    tops.push([id, top]);
    if (top < firstTop) {
      firstTop = top;
      first = id;
    }
    if (top <= vh * (SCENES[id].cueAt ?? J_CUT) && top > nextTop) {
      nextTop = top;
      next = id;
    }
  }
  next ??= first;
  const now = performance.now();
  const fast = speed(now) >= STILL;
  if (!next || next === active) {
    candidate = null;
    window.clearTimeout(dwellTimer);
    prepareAfter(tops);
    return;
  }
  // Hysteresis: a scene flung past on the way somewhere else never takes the score.
  if (next !== candidate) {
    candidate = next;
    since = now;
  }
  if (active === null || !fast || now - since >= DWELL) {
    commit(next);
    prepareAfter(tops);
    return;
  }
  window.clearTimeout(dwellTimer);
  dwellTimer = window.setTimeout(schedule, DWELL - (now - since) + 10);
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(evaluate);
}

function measure() {
  const y = window.scrollY;
  for (const scene of registry.values()) scene.top = scene.el.getBoundingClientRect().top + y;
  schedule();
}

let wired = false;
function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure);
  // Content above a scene growing or shrinking moves it: the document's size changes with it.
  new ResizeObserver(measure).observe(document.documentElement);
  // Sound being switched on must re-announce the current scene to the director.
  audio.subscribe(schedule);
}

/** Registers a scene element so scroll position decides which cue plays. */
export function useScene(ref: RefObject<HTMLElement | null>, id: SceneId) {
  const instance = useLenis();
  useEffect(() => {
    lenis = instance ?? null;
  }, [instance]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    wire();
    registry.set(id, { el, top: el.getBoundingClientRect().top + window.scrollY });
    schedule();
    return () => {
      registry.delete(id);
      if (active === id) active = null;
      if (candidate === id) candidate = null;
      schedule();
    };
  }, [ref, id]);
}

/**
 * The scene the score is in, for the scenes' own light and motion. It arrives as a transition:
 * a change of scene re-renders every scene that asks, and as a transition React renders that in
 * small slices between frames rather than in one long frame at the cut. (The music doesn't wait
 * on this: the director hears of the change directly.) Null on the server and through hydration.
 */
export function useActiveScene() {
  const [scene, setScene] = useState<SceneId | null>(null);
  useEffect(() => {
    const sync = () => startTransition(() => setScene(active));
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return scene;
}

/** Whether `id` is the scene the score is in, read now (for event handlers: it re-renders nothing). */
export const sceneIs = (id: SceneId) => active === id;

/**
 * Whether `id` is the scene the score is in. Only a change for this scene re-renders the caller
 * (a change of scene re-renders the two scenes involved, not every scene), and it arrives as a
 * transition, like useActiveScene.
 */
export function useSceneIs(id: SceneId) {
  const [is, setIs] = useState(false);
  useEffect(() => {
    let last = false;
    const sync = () => {
      const next = active === id;
      if (next === last) return;
      last = next;
      startTransition(() => setIs(next));
    };
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [id]);
  return is;
}
