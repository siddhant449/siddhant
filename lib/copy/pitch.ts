/**
 * Copy for the client-pitch sections: at a glance, services, process,
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
/* Services (after basement.studio/services)                            */
/* ------------------------------------------------------------------ */

export type Service = {
  group: "Design" | "Engineering";
  name: string;
  /** The first `lead` words are the outcome and read brighter. */
  lead: number;
  body: string;
  deliverables: string[];
};

export const servicesCopy = {
  title: "Services",
  intro:
    "I design websites for manufacturers, brands and agencies, and engineer production systems for healthcare, commerce and finance. I work at both ends of a product: the page a customer sees and the system that answers it.",
  image: { src: "/pitch/rock-ember.webp", alt: "Dark fissured rock, toned in ember red." },
  items: [
    {
      group: "Design",
      name: "Marketing websites",
      lead: 9,
      body: "A site a buyer trusts before they pick up the phone. I write, design and build it, so the proof your buyers look for is on the first screen and the enquiry is one step away.",
      deliverables: ["Positioning and copy", "Page structure", "Design", "Next.js build", "Launch and handover"],
    },
    {
      group: "Design",
      name: "Storefronts and brand sites",
      lead: 9,
      body: "Pages that sell with calm, not countdown timers. Ingredients, reviews, materials and test results sit next to the product, where shoppers and specifiers actually check them.",
      deliverables: ["Product and collection pages", "Proof and reviews", "Responsive build", "Performance and SEO basics"],
    },
    {
      group: "Engineering",
      name: "Backends and realtime",
      lead: 9,
      body: "Software for systems that can’t go down. Multi-tenant data that never crosses tenants, messages that arrive once and in order, and tests that keep it that way.",
      deliverables: ["API and data model", "Realtime and queues", "Automated tests", "Cloud deployment", "Audit and access control"],
    },
    {
      group: "Engineering",
      name: "AI features",
      lead: 7,
      body: "AI that explains its own answers. Search that reads photos, recommendations with stated reasons and risk scores a non-specialist can follow, served fast enough to use.",
      deliverables: ["Search and retrieval", "Recommendations", "ML pipelines and retraining", "Explanations", "Monitoring"],
    },
  ] satisfies Service[],
} as const;

/* ------------------------------------------------------------------ */
/* How a project runs (after Significa's hero stack)                     */
/* ------------------------------------------------------------------ */

export const processCopy = {
  label: "How a project runs",
  steps: [
    { word: "Listen.", panel: "Listen", title: "A call, then a written brief.", note: "You get scope, approach and cost on one page." },
    { word: "Shape.", panel: "Shape", title: "Words and structure first, then design.", note: "You see real pages before the build starts." },
    { word: "Build.", panel: "Build", title: "Built in the open, tested as it grows.", note: "You get a staging link and written updates." },
    { word: "Launch.", panel: "Launch", title: "Launch, handover, then looking after it.", note: "You own the code, content and accounts." },
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
    asset: "Dark Rock texture (height map and diffuse), used for the molten card, the avatar disc and the services image",
    files: ["/pitch/rock-ember.webp"],
    source: "https://polyhaven.com/a/dark_rock",
    licence: "CC0 1.0 (Poly Haven)",
    credit: "Poly Haven",
  },
] as const;

/* Layout references, for the record: rejouice.com, basement.studio/services,
   significa.co, rejouice.com/services, ramotion.com/faq, dennissnellenberg.com. */

/* ------------------------------------------------------------------ */
/* Chapter titles: a giant word before each practice (after Rejouice). */
/* ------------------------------------------------------------------ */
export const chapterTitles = {
  design: { word: "Website", sub: ["One site, written and built", "to win the ", "enquiry."] as [string, string, string] },
  // owner to confirm
  engineering: { word: "Product", sub: ["Software built for systems", "that can’t go ", "down."] as [string, string, string] },
};
