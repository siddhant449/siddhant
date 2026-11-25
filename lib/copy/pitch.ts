/**
 * Copy for the client-pitch sections: why hire me, how a project runs and
 * the chapter titles.
 *
 * Facts come from lib/content.ts. Nothing here states a price, a duration,
 * a reply time or a client that isn't named in content.ts.
 */
import { engineering } from "@/lib/content";

const sys = (slug: string) => engineering.projects.find((p) => p.slug === slug);
const fact = (slug: string, i: number) => sys(slug)?.facts[i]?.value ?? "";

/* ------------------------------------------------------------------ */
/* Why hire me (after area17.com/culture, the values)                     */
/* ------------------------------------------------------------------ */

export type Reason = {
  /** one word in the pill above the reason */
  tag: string;
  /** pill ground, from the Ember palette */
  tone: "signal" | "stone" | "deep" | "ink";
  title: string;
  body: string;
};

export const whyCopy = {
  title: "Why hire me", // owner to confirm
  statement: "I write, design and build the work myself, then look after it once it’s live.", // owner to confirm
  reasons: [
    {
      tag: "Design and code", // owner to confirm
      tone: "signal",
      title: "Designer and engineer in one", // owner to confirm
      body: "The person who designs it builds it, so nothing gets lost between design and code.", // owner to confirm
    },
    {
      tag: "Reliability", // owner to confirm
      tone: "stone",
      title: "Built to hold up", // owner to confirm
      body: "Tested before it ships, monitored once it runs.", // owner to confirm
    },
    {
      tag: "Clarity", // owner to confirm
      tone: "deep",
      title: "Clear communication", // owner to confirm
      body: "A written brief, a staging link to follow along, written updates.", // owner to confirm
    },
    {
      tag: "Ownership", // owner to confirm
      tone: "ink",
      title: "Yours to keep", // owner to confirm
      body: "You own the code, the content and the accounts.", // owner to confirm
    },
  ] satisfies Reason[],
  cta: { label: "Start a project", href: "#contact" }, // owner to confirm
};

/* ------------------------------------------------------------------ */
/* How a project runs (after Significa's hero stack)                     */
/* ------------------------------------------------------------------ */

export const processCopy = {
  label: "How a project runs",
  steps: [
    { word: "Listen.", panel: "Listen", title: "A call, then a written brief.", note: "You get scope, approach and cost on one page.", thumb: { src: "/pitch/process-listen.webp", alt: "Hands writing notes in a notebook beside a coffee cup and a phone." } },
    { word: "Shape.", panel: "Shape", title: "Words and structure first, then design.", note: "You see real pages before the build starts.", thumb: { src: "/pitch/process-shape.webp", alt: "Wireframe sketches and a sticky note in an open notebook." } },
    { word: "Build.", panel: "Build", title: "Built in the open, tested as it grows.", note: "You get a staging link and written updates.", thumb: { src: "/pitch/process-build.webp", alt: "Hands typing on a laptop with code on the screen." } },
    { word: "Launch.", panel: "Launch", title: "Launch, handover, then looking after it.", note: "You own the code, content and accounts.", thumb: { src: "/pitch/process-launch.webp", alt: "A finished website open on a laptop on a wooden desk." } },
  ],
  brief: { title: "Brief: Truvolt website", signed: "Agreed." },
  shape: { src: "/work/skinrock/mobile.webp", alt: "Skinrock website on a phone." },
  launch: { src: "/work/truvolt-mobile.webp", alt: "Truvolt website on a phone." },
  /** The Build phone draws the clinical messaging system, top to bottom. */
  system: {
    nodes: [
      ["Clients", "Web · mobile · SSO"],
      ["REST API", "Stateless"],
      ["Realtime", "Socket.IO · Redis"],
      ["Service Bus", `${fact("clinical-messaging", 1)} topics · DLQ`],
      ["Postgres", "Row-level security"],
      ["Audit log", "Append-only"],
    ] as const,
    footer: `${fact("clinical-messaging", 2)} tests passing`,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Third-party assets                                                    */
/* ------------------------------------------------------------------ */

export const credits = [
  {
    asset: "How a project runs, Listen thumbnail (cropped, warm-graded)",
    files: ["/pitch/process-listen.webp"],
    source: "https://stocksnap.io/photo/writing-letter-BGGYUZB7LO",
    licence: "CC0 1.0 (StockSnap)",
    credit: "Kristin Hardwick",
  },
  {
    asset: "How a project runs, Shape thumbnail (cropped, warm-graded)",
    files: ["/pitch/process-shape.webp"],
    source: "https://stocksnap.io/photo/office-work-91WZ32J28K",
    licence: "CC0 1.0 (StockSnap)",
    credit: "Jeffrey Betts",
  },
  {
    asset: "How a project runs, Build thumbnail (cropped, warm-graded)",
    files: ["/pitch/process-build.webp"],
    source: "https://stocksnap.io/photo/coding-business-DZ1EFM9PIK",
    licence: "CC0 1.0 (StockSnap)",
    credit: "Marc Chouinard",
  },
  {
    asset: "How a project runs, Launch thumbnail (cropped, warm-graded)",
    files: ["/pitch/process-launch.webp"],
    source: "https://stocksnap.io/photo/laptop-mac-OR7D4PANCK",
    licence: "CC0 1.0 (StockSnap)",
    credit: "Matthew Henry",
  },
] as const;

/* Layout references, for the record: rejouice.com, area17.com/culture,
   significa.co, rejouice.com/services, ramotion.com/faq, dennissnellenberg.com. */

/* ------------------------------------------------------------------ */
/* Chapter titles: a giant word before each practice (after Rejouice). */
/* ------------------------------------------------------------------ */
export const chapterTitles = {
  design: { word: "Website", sub: ["One site, written and built", "to win the ", "enquiry."] as [string, string, string] },
  // owner to confirm
  engineering: { word: "Product", sub: ["Software built for systems", "that can’t go ", "down."] as [string, string, string] },
};
