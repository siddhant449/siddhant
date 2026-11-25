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
  credit: "Garment photographs: The Metropolitan Museum of Art, Open Access (CC0). Tags shown are the museum’s own metadata.",
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

/** Met Open Access garments, dithered to the Ember palette. Tags are the museum's metadata. */
export const garments = [
  { id: 159482, src: "/systems/met-159482.webp", tags: ["dress", "cotton", "1886–88"] },
  { id: 159244, src: "/systems/met-159244.webp", tags: ["dress", "wool, silk", "ca. 1855"] },
  { id: 157943, src: "/systems/met-157943.webp", tags: ["dress", "silk", "ca. 1885"] },
  { id: 159222, src: "/systems/met-159222.webp", tags: ["dress", "cotton", "ca. 1890"] },
  { id: 80769, src: "/systems/met-80769.webp", tags: ["dress", "cotton", "ca. 1840"] },
  { id: 82122, src: "/systems/met-82122.webp", tags: ["dress", "silk", "ca. 1820"] },
] as const;

export const credits = [
  {
    file: "public/systems/met-159482.webp",
    title: "Dress, 1886–88 (2009.300.900)",
    source: "https://www.metmuseum.org/art/collection/search/159482",
    licence: "CC0 1.0 (The Met Open Access)",
    credit: "Brooklyn Museum Costume Collection at The Metropolitan Museum of Art, Gift of the Brooklyn Museum, 2009; Gift of Amelia Beard Hollenback, 1966",
  },
  {
    file: "public/systems/met-159244.webp",
    title: "Dress, ca. 1855 (2009.300.686a, b)",
    source: "https://www.metmuseum.org/art/collection/search/159244",
    licence: "CC0 1.0 (The Met Open Access)",
    credit: "Brooklyn Museum Costume Collection at The Metropolitan Museum of Art, Gift of the Brooklyn Museum, 2009; Gift of Miss F. P. Weiss, 1948",
  },
  {
    file: "public/systems/met-157943.webp",
    title: "Dress, ca. 1885 (2009.300.3049a, b)",
    source: "https://www.metmuseum.org/art/collection/search/157943",
    licence: "CC0 1.0 (The Met Open Access)",
    credit: "Brooklyn Museum Costume Collection at The Metropolitan Museum of Art, Gift of the Brooklyn Museum, 2009; Gift of Kate Macon Hoffmaster, 1946",
  },
  {
    file: "public/systems/met-159222.webp",
    title: "Dress, ca. 1890 (2009.300.666)",
    source: "https://www.metmuseum.org/art/collection/search/159222",
    licence: "CC0 1.0 (The Met Open Access)",
    credit: "Brooklyn Museum Costume Collection at The Metropolitan Museum of Art, Gift of the Brooklyn Museum, 2009; Gift of Marion Jardine, 1941",
  },
  {
    file: "public/systems/met-80769.webp",
    title: "Dress, ca. 1840 (1993.32)",
    source: "https://www.metmuseum.org/art/collection/search/80769",
    licence: "CC0 1.0 (The Met Open Access)",
    credit: "Gift of Richard Martin and Harold Koda, in honor of Cora Ginsburg, 1993",
  },
  {
    file: "public/systems/met-82122.webp",
    title: "Dress, ca. 1820 (1971.242.1a–e)",
    source: "https://www.metmuseum.org/art/collection/search/82122",
    licence: "CC0 1.0 (The Met Open Access)",
    credit: "Purchase, Irene Lewisohn Bequest, 1971",
  },
] as const;
