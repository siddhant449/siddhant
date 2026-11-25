/*
  Copy for the Engineering systems (components/systems).
  Every fact, title, line, role and stack comes from lib/content.ts; this file
  only holds UI words, the vocabulary of the simulated figures, and credits.
  Figure contents that move are illustrations and are labelled "Simulated".
*/
import { engineering, type SystemProject } from "@/lib/content";

export type SystemKind = "clinical" | "commerce" | "risk" | "shizuku";

/** Figures in page order, matched to engineering.projects by index. */
export const systemKinds: SystemKind[] = ["clinical", "commerce", "risk", "shizuku"];

export const systemsCopy = {
  simulated: "Simulated",
  factsLabel: "Facts",
  caseStudy: "Read the case study",
  /** Word index after which each title breaks onto a second line (0 = no break). */
  titleBreak: [2, 2, 2, 0],
  /** Under 1200px each figure becomes a deck of panels; the panel switcher's label. */
  deckLabel: "Figure panels",
  show: "Show",
} as const;

/** Panel names for the compact (deck) figures, in panel order. */
export const deckPanels = {
  clinical: ["Message path", "Automated tests"],
  commerce: ["Visual search", "Catalogue"],
  risk: ["News", "Features", "Risk ensemble", "Mirror feeds"],
  shizuku: ["Camera rig", "Page", "Pipelines"],
} as const;

/** Look up a diagram node's sub-label in content.ts, so figure captions never restate numbers by hand. */
export function nodeSub(project: SystemProject, id: string): string {
  return project.diagram.nodes.find((n) => n.id === id)?.sub ?? "";
}

/** The first run of digits in a fact value, as a number ("1,313" → 1313, "146+" → 146). */
export function factNumber(project: SystemProject, labelStartsWith: string): number {
  const f = project.facts.find((x) => x.label.startsWith(labelStartsWith));
  const m = f?.value.match(/[\d,]+/);
  return m ? Number(m[0].replace(/,/g, "")) : 0;
}

export function titleLines(title: string, breakAfter: number): string[] {
  const words = title.split(" ");
  if (!breakAfter || words.length <= breakAfter) return [title];
  return [words.slice(0, breakAfter).join(" "), words.slice(breakAfter).join(" ")];
}

export const projectAt = (i: number) => engineering.projects[i];

/* ------------------------------------------------------------------ */
/* Figure vocabulary (illustrative, shown under a "Simulated" label)    */
/* ------------------------------------------------------------------ */

export const clinicalCopy = {
  testsTitle: "Automated tests",
  testsSub: "front and back",
  testsRun: "Simulated run",
  passing: "passing",
  columns: ["Received", "Service Bus", "Delivered", "Dead-letter"],
  topics: [
    "message.created",
    "message.delivered",
    "receipt.read",
    "thread.assigned",
    "attachment.scanned",
    "presence.updated",
    "message.edited",
    "thread.archived",
  ],
  tenant: "Tenant",
  rls: "RLS",
  retry: "Retry 1",
  replayed: "Replayed",
  empty: "Empty",
} as const;

export const commerceCopy = {
  catalogue: "Catalogue",
  tagsHead: "Tags · GPT-4o vision",
  status: "Status",
  queued: "Queued",
  tagging: "Tagging",
  tagged: "Tagged",
  searchTitle: "Visual search",
  queryPhoto: "Query · a photo",
  queryWords: "Query · words",
  wordsQuery: "ivory dress, puffed sleeves",
  nearest: "Nearest results",
} as const;

export const riskCopy = {
  news: "News",
  newsNote: "Simulated stream",
  article: "Article",
  source: "source",
  desks: ["rates", "earnings", "commodities", "FX", "credit"],
  features: "Features",
  featureStore: "Feature store",
  live: "live",
  valuesSimulated: "Values simulated",
  ensemble: "Risk ensemble",
  scoreNote: "Risk score · simulated",
  explainedWith: "Explained with",
  shapFeatures: ["vol_20d", "spread_z", "news_sent_6h", "drawdown_5d", "beta_mkt", "liq_score"],
  mirror: "Mirror feeds",
  uptime: "Uptime",
  primary: "Primary feed",
  mirrorFeed: "Mirror feed",
  closed: "Closed",
  standby: "Standby",
  retrain: "Weekly retrain",
  strip: "Illustrative 90-day strip",
} as const;

export const shizukuCopy = {
  groups: [
    { name: "Layout", items: ["Pages and beats", "Page 2 · beats", "Page 3 · beats"] },
    { name: "Panels", items: ["Panel 1 · wide", "Panel 2 · close-up", "Panel 3 · over the shoulder", "Panel 4 · reverse"] },
    { name: "Voice", items: ["Character A", "Character B"] },
  ],
  engine: "2.5D engine",
  engineNote: "one scene, every panel",
  camera: "Camera",
  page: "Page 1 · same scene, four cameras",
} as const;

/* ------------------------------------------------------------------ */
/* Third-party assets                                                   */
/* ------------------------------------------------------------------ */

/**
 * The catalogue: hand-made pixel garments (sprites in components/systems/sprites-garments.ts),
 * tagged the way the vision model would tag them. The words query matches the first.
 */
export const garments = [
  { id: "puff-dress", name: "Ivory dress with puffed sleeves", tags: ["dress", "ivory", "puff sleeve"] },
  { id: "coat", name: "Long stone coat", tags: ["coat", "stone", "double-breasted"] },
  { id: "dress", name: "Red slip dress", tags: ["dress", "red", "a-line"] },
  { id: "shirt", name: "White shirt", tags: ["shirt", "white", "button-up"] },
  { id: "jacket", name: "Charcoal jacket", tags: ["jacket", "charcoal", "cropped"] },
  { id: "skirt", name: "Rust pleated skirt", tags: ["skirt", "rust", "pleated"] },
  { id: "trousers", name: "Grey wide-leg trousers", tags: ["trousers", "grey", "wide-leg"] },
] as const;

/** Third-party assets used by the systems figures: none (all figure art is hand-made pixel art). */
export const credits: readonly { file: string; title: string; source: string; licence: string; credit: string }[] = [];
