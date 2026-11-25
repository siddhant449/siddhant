/**
 * Copy for the client-pitch sections: at a glance, why hire me, process,
 * ways to work, questions and the mid-page call to action.
 *
 * Facts come from lib/content.ts. Nothing here states a price, a duration,
 * a reply time or a client that isn't named in content.ts.
 */
import { caseStudyOf, contact, design, engineering, site } from "@/lib/content";

const sys = (slug: string) => engineering.projects.find((p) => p.slug === slug);
const fact = (slug: string, i: number) => sys(slug)?.facts[i]?.value ?? "";
const host = (slug: string) => design.projects.find((p) => p.slug === slug)?.host ?? "";

/** "627 backend and 686 frontend tests" lives in the clinical case study's prose. */
const testSplit = (() => {
  const body = caseStudyOf("clinical-messaging")?.inside.map((i) => i.body).join(" ") ?? "";
  const hit = body.match(/([\d,]+) backend and ([\d,]+) frontend tests/);
  if (!hit) return null;
  const n = (s: string) => Number(s.replace(/,/g, ""));
  return { backend: n(hit[1]), frontend: n(hit[2]), label: `${hit[1]} backend, ${hit[2]} frontend` };
})();

const subject = (s: string) => `mailto:${site.email}?subject=${encodeURIComponent(s)}`;

export const mail = {
  project: subject("New project"),
  question: subject("A question before we start"),
};

/* ------------------------------------------------------------------ */
/* At a glance (after Rejouice, "at a Glance")                          */
/* ------------------------------------------------------------------ */

export const glance = {
  title: "Siddhant at a glance.",
  email: site.email,
  sites: {
    title: `${design.projects.length} live websites`,
    note: "written, designed and built by me, end to end.",
    hosts: design.projects.map((p) => p.host),
  },
  sectors: [
    ...design.projects.map((p) => p.sector),
    ...engineering.projects.filter((p) => p.nda).map((p) => p.domain),
  ],
  truvolt: {
    host: host("truvolt"),
    src: "/work/truvolt-hero.webp",
    alt: "Truvolt home page, a website for a transformer manufacturer.",
  },
  tests: {
    title: `${fact("clinical-messaging", 2)} automated tests`,
    note: "guarding one HIPAA-compliant messaging platform.",
    split: testSplit,
  },
  systems: {
    title: `${engineering.projects.filter((p) => p.nda).length} production systems`,
    note: "for healthcare, commerce and finance. Names under NDA, walkthrough on request.",
  },
  disciplines: { title: "Two disciplines", note: "Design / Engineering", link: "See the services" },
  risk: {
    title: "Trading risk platform",
    note: `${fact("trading-risk", 1)} news articles read a day, with mirror feeds and circuit breakers.`,
    big: fact("trading-risk", 2),
    bigLabel: "uptime",
  },
  markets: {
    title: "India to Switzerland",
    note: "Sites for businesses in India, Switzerland, the United States and the UAE.",
    src: "/work/skinrock/mobile.webp",
    alt: "Skinrock website on a phone.",
  },
  place: {
    title: site.location,
    note: "Working in IST, with calls in your hours.",
    here: "Ahmedabad",
    there: "Your time",
  },
} as const;

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
/* Ways to work together (after Rejouice /services, engagement models)  */
/* ------------------------------------------------------------------ */

export type WayRow = {
  name: string;
  thumb?: string;
  mark?: "messaging" | "search" | "risk";
  middle: string;
  right: string;
  details?: [string, string][];
};

export type Way = {
  id: string;
  tab: string;
  tabNote: string;
  theme: "paper" | "ink" | "deep";
  word: string;
  sub: [string, string, string];
  name: [string, string];
  body: string;
  rows: WayRow[];
};

const site3 = (slug: string): WayRow => {
  const p = design.projects.find((x) => x.slug === slug)!;
  return {
    name: p.name,
    thumb: p.images.hero,
    middle: p.sector,
    right: p.place,
    details: [
      ["Role", p.role],
      ["Stack", p.stack.join(", ")],
      ["Live", p.host],
    ],
  };
};

/** "Tables under…" reads mid-sentence as "tables under…"; "FastAPI" keeps its capitals. */
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

const sys3 = (slug: string, mark: WayRow["mark"], a: string, b: string): WayRow => {
  const p = sys(slug)!;
  return {
    name: p.title.replace(" platform", ""),
    mark,
    middle: p.domain,
    right: "Under NDA",
    details: [
      ["Built", `${p.facts[0].value} ${lowerFirst(p.facts[0].label)}`],
      [a, b],
    ],
  };
};

export const waysCopy = {
  title: "Three ways to work together.",
  ways: [
    {
      id: "way-website",
      tab: "Website project",
      tabNote: "Scoped before it starts.",
      theme: "paper",
      word: "Website",
      sub: ["One site, written and built", "to win the ", "enquiry."],
      name: ["Website project.", "Scoped up front."],
      body: "For manufacturers, brands and agencies that need a site buyers trust. It starts with a call and a written brief that sets the scope. I write the copy, design the pages and build the site, and you review real pages in the browser before anything goes live.",
      rows: [site3("truvolt"), site3("skinrock"), site3("prefdigihub")],
    },
    {
      id: "way-product",
      tab: "Product build",
      tabNote: "Shipped in phases.",
      theme: "ink",
      word: "Product",
      sub: ["A system that holds up", "when it ", "matters."],
      name: ["Product build.", "Scoped in phases."],
      body: "For teams that need a backend, a realtime layer or an AI feature in production. Each phase starts with a short scoping note, ships something that runs, and ends with tests and a handover. Start with one phase and decide on the next from there.",
      rows: [
        sys3("clinical-messaging", "messaging", "Tested", `${fact("clinical-messaging", 2)} automated tests`),
        sys3("fashion-commerce", "search", "Result", `${fact("fashion-commerce", 1)} search accuracy, under a second`),
        sys3("trading-risk", "risk", "Uptime", `${fact("trading-risk", 2)}, with circuit breakers`),
      ],
    },
    {
      id: "way-partner",
      tab: "Ongoing partner",
      tabNote: "Regular time, every month.",
      theme: "deep",
      word: "Partner",
      sub: ["Someone who already knows", "how it all ", "works."],
      name: ["Ongoing partner.", "Time every month."],
      body: "For sites and systems after launch: changes, new pages and new features without briefing someone new each time. We agree the time each month and one simple way to send requests, then look back at what shipped before planning the next month.",
      rows: [
        { name: "Website care", middle: "Updates, new pages, speed and search checks", right: "On request" },
        { name: "System care", middle: "Monitoring, fixes and dependency upgrades", right: "Ongoing" },
        { name: "Product time", middle: "New features on a steady cadence", right: "Planned monthly" },
      ],
    },
  ] satisfies Way[] as Way[],
} as const;

/* ------------------------------------------------------------------ */
/* Questions (after Ramotion /faq)                                      */
/* ------------------------------------------------------------------ */

export const faqCopy = {
  title: "Questions before we start",
  cta: contact.start,
  items: [
    {
      q: "What do you need from me to start?",
      a: "A short note on the business, who you sell to and what the site or system has to do. Brand files, existing copy and access to the current site help, but none of it is required to begin.",
    },
    {
      q: "Do you write the copy?",
      a: "Yes. Every site in the portfolio was written, designed and built by me. I’ll ask for your documents, spec sheets and a call with whoever knows the product best.",
    },
    {
      q: "How long does a project take?",
      a: "It depends on the scope. The proposal sets the scope and the timeline before any work starts, and any change to either is agreed in writing first.",
    },
    {
      q: "Can you work inside our existing product?",
      a: "Yes. I can start from your repository, learn how it’s built and add to it, or take over one part of it, such as a service, a data pipeline or the front end.",
    },
    {
      q: "Can I see the engineering work?",
      a: "Three of the systems are under NDA, so their names stay private. The architecture and the numbers are on this site, and I’m happy to walk you through them on a call.",
    },
    {
      q: "What happens after launch?",
      a: "You own the code, the content and the accounts. I hand over with a walkthrough, and can stay on for changes as an ongoing partner if you want that.",
    },
    {
      q: "Do you work with clients outside India?",
      a: "Yes. I’ve built sites for businesses in India, Switzerland, the United States and the UAE. I’m based in Ahmedabad and schedule calls in your time zone.",
    },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Mid-page call to action (after Dennis Snellenberg's footer)          */
/* ------------------------------------------------------------------ */

export const ctaCopy = {
  title: contact.title,
  start: contact.start,
  email: site.email,
  linkedin: site.links.linkedin,
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
