/**
 * The A-side reel's scroll budget, in viewport heights. The title card and each project hold
 * a 100svh stage pinned inside its own track; every stage slides up over the one before it,
 * so each track starts OVERLAP before the previous one ends and the covered stage stays put.
 */
export const SLIDE = 40;
/** The title card on its own, before A1 slides over it. */
export const HOLD = 70;
/** One project: the exploded hero, its six chapters, then the phones. */
export const BODY = 300;

export const TITLE_TRACK = 100 + HOLD + SLIDE;
export const OVERLAP = 100 + SLIDE;
/** Track i starts i × STEP into the reel. */
export const STEP = SLIDE + BODY;
export const trackHeight = (i: number, count: number) => 100 + STEP + (i < count - 1 ? SLIDE : 0);
/** How far the reel scrolls while its stages are pinned (its height less one viewport). */
export const reelLength = (count: number) => count * STEP;

/* Beats inside one project's body, as shares of BODY. */
/** The exploded stack holds, labelled, until here... */
export const EXPLODED = 0.04;
/** ...and has collapsed into the flat chapter-01 screen by here. */
export const LANDED = 0.12;
/** The browser frame steps back and the phones rise from here to the end. */
export const PHONES = 0.85;
export const CHAPTERS = 6;
export const CHAPTER = (PHONES - LANDED) / CHAPTERS;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Scroll into project i's track (vh), from the reel's progress. */
export const localT = (p: number, i: number, count: number) => p * reelLength(count) - i * STEP;

/** Chapters played so far, 0..6 (2.5 = halfway through chapter 03). */
export const chapterProgress = (q: number) => clamp((q - LANDED) / CHAPTER, 0, CHAPTERS);

/** The chapter on screen: -1 while the hero is exploded, then 0..5. */
export const chapterAt = (q: number) => (q < LANDED ? -1 : Math.min(CHAPTERS - 1, Math.floor((q - LANDED) / CHAPTER)));

/** The project whose stage is up: a stage counts once it has slid halfway over the last. */
export function activeAt(p: number, count: number) {
  for (let i = count - 1; i > 0; i--) if (localT(p, i, count) >= SLIDE / 2) return i;
  return 0;
}
