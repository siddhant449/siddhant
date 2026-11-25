/**
 * Every word on the site lives here.
 *
 * Client work done at an employer is described by what it does, never by its
 * product name. Keep it that way when editing.
 */

export const site = {
  name: "Siddhant Kotak",
  shortName: "Siddhant",
  role: "Designer & fullstack AI engineer",
  location: "Ahmedabad, India",
  timeZone: "Asia/Kolkata",
  email: "siddharthkotak280@gmail.com",
  url: "https://siddhant-xi.vercel.app",
  links: {
    linkedin: "https://www.linkedin.com/in/siddhant-kotak-07116a208",
    github: "https://github.com/SiddhantKotak",
    resume: "/docs/siddhant-kotak-resume.pdf",
  },
  description:
    "Siddhant Kotak designs websites and builds the software behind them: marketing sites for manufacturers, agencies and brands, and AI and backend systems for healthcare, commerce and finance.",
} as const;

/** Section index in page order. The two kinds of work carry their counts. */
export const nav = [
  { label: "Design", href: "#design" },
  { label: "Engineering", href: "#engineering" },
  { label: "Why me", href: "#why" },
  { label: "About", href: "#about" },
] as const;

/* ------------------------------------------------------------------ */
/* Hero: one line per discipline, and a door to each                    */
/* ------------------------------------------------------------------ */

export const hero = {
  /** Four short columns over the wordmark, Monolith-style. */
  meta: [
    { strong: "Siddhant Kotak", soft: "Designer & fullstack AI engineer" },
    { strong: "Ahmedabad, India", soft: "time" },
    { strong: "Available for projects", soft: "Websites and systems", dot: true },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* 01 Design: live websites                                             */
/* ------------------------------------------------------------------ */

export type Screen = { src: string; caption: string; phone?: boolean };

export type LiveProject = {
  slug: string;
  name: string;
  url: string;
  host: string;
  sector: string;
  place: string;
  kind: string;
  summary: string;
  role: string;
  stack: string[];
  /** Colour of the presentation board behind the screenshots. */
  tone: string;
  images: {
    hero: string;
    mobile: string;
    alt: string;
    mobileAlt: string;
  };
  /** Every screen captured from the live site, in page order. */
  screens: Screen[];
};

export const design = {
  index: "01",
  label: "Design",
  meta: "Designed and built end to end",
  title: "Websites",
  intro:
    "Five live sites for a transformer maker, a Swiss stone brand, a skincare label and two growth agencies. Each one written, designed and built by me.",
  projects: [
    {
      slug: "truvolt",
      name: "Truvolt",
      url: "https://truvolt.vercel.app/",
      host: "truvolt.vercel.app",
      sector: "Industrial manufacturing",
      place: "Kolkata, India",
      kind: "Client site",
      summary:
        "A website for a transformer manufacturer founded in 1970, written for engineering buyers: the range, the plant behind it and the operators who already rely on it.",
      role: "Design and development",
      stack: ["Next.js", "TypeScript"],
      tone: "#14365f",
      images: {
        hero: "/work/truvolt-hero.webp",
        mobile: "/work/truvolt-mobile.webp",
        alt: "Truvolt home page: the headline “Reliable Power for a World of Industrial Applications” beside capacity figures and a photograph of a power transformer.",
        mobileAlt: "Truvolt home page on a phone.",
      },
      screens: [
        { src: "/work/truvolt-hero.webp", caption: "Home" },
        { src: "/work/truvolt/standard.webp", caption: "The standard" },
        { src: "/work/truvolt/clients.webp", caption: "Operators" },
        { src: "/work/truvolt/core.webp", caption: "From the core outward" },
        { src: "/work/truvolt/range.webp", caption: "The range" },
        { src: "/work/truvolt-mobile.webp", caption: "Phone", phone: true },
        { src: "/work/truvolt/process.webp", caption: "Process" },
        { src: "/work/truvolt/delivery.webp", caption: "Tested for delivery" },
        { src: "/work/truvolt/enquiry.webp", caption: "One enquiry" },
      ],
    },
    {
      slug: "skinrock",
      name: "Skinrock",
      url: "https://skinrock-kohl.vercel.app/",
      host: "skinrock-kohl.vercel.app",
      sector: "Architectural materials",
      place: "Switzerland",
      kind: "Brand website",
      summary:
        "A site for a Swiss natural stone veneer, 1.5 mm thin and translucent when backlit. It leads with the material itself, then the collection, the projects and the test results architects ask for.",
      role: "Design and development",
      stack: ["Next.js", "TypeScript"],
      tone: "#4a3b30",
      images: {
        hero: "/work/skinrock/cover.webp",
        mobile: "/work/skinrock/mobile.webp",
        alt: "Skinrock home page: the headline “Real stone. Thin enough to let light through.” over a room clad in stone veneer.",
        mobileAlt: "Skinrock home page on a phone.",
      },
      screens: [
        { src: "/work/skinrock/cover.webp", caption: "Home" },
        { src: "/work/skinrock/bend.webp", caption: "It bends" },
        { src: "/work/skinrock/collection.webp", caption: "Collection" },
        { src: "/work/skinrock/mobile.webp", caption: "Phone", phone: true },
        { src: "/work/skinrock/projects.webp", caption: "Projects" },
        { src: "/work/skinrock/why.webp", caption: "Why Skinrock" },
        { src: "/work/skinrock/tested.webp", caption: "Independently tested" },
        { src: "/work/skinrock/samples.webp", caption: "Samples" },
      ],
    },
    {
      slug: "seoulceuticals",
      name: "SeoulCeuticals",
      url: "https://siddhant449.github.io/nutraceuticals/",
      host: "siddhant449.github.io/nutraceuticals",
      sector: "Skincare e-commerce",
      place: "United States",
      kind: "E-commerce storefront",
      summary:
        "A storefront for a Korean-inspired skincare brand, pairing editorial typography with the proof shoppers look for: ingredients, reviews and routines.",
      role: "Design and development",
      stack: ["HTML", "CSS", "JavaScript"],
      tone: "#c4552a",
      images: {
        hero: "/work/seoulceuticals/cover.webp",
        mobile: "/work/seoulceuticals/mobile.webp",
        alt: "SeoulCeuticals flagship line: “Multiple actives, never just one.” above product photography of serums and creams.",
        mobileAlt: "SeoulCeuticals home page on a phone.",
      },
      screens: [
        { src: "/work/seoulceuticals/cover.webp", caption: "Flagship line" },
        { src: "/work/seoulceuticals/approach.webp", caption: "Approach" },
        { src: "/work/seoulceuticals/mobile.webp", caption: "Phone", phone: true },
        { src: "/work/seoulceuticals/formula.webp", caption: "The formula" },
        { src: "/work/seoulceuticals/routine.webp", caption: "Morning and night" },
        { src: "/work/seoulceuticals/story.webp", caption: "Our story" },
        { src: "/work/seoulceuticals/faq.webp", caption: "Questions" },
      ],
    },
    {
      slug: "prefdigihub",
      name: "Pref Digi Hub",
      url: "https://prefdigihub.vercel.app/",
      host: "prefdigihub.vercel.app",
      sector: "Digital growth agency",
      place: "India and UAE",
      kind: "Agency website",
      summary:
        "A site for a growth agency working across SEO, AI search and paid media. A live estimate in the hero turns a visitor’s budget into a projected number of enquiries.",
      role: "Design and development",
      stack: ["Next.js", "TypeScript"],
      tone: "#23207a",
      images: {
        hero: "/work/prefdigihub/cover.webp",
        mobile: "/work/prefdigihub/mobile.webp",
        alt: "Pref Digi Hub home page: “Get found. Get chosen. Get more customers.” beside an enquiry estimate panel.",
        mobileAlt: "Pref Digi Hub home page on a phone.",
      },
      screens: [
        { src: "/work/prefdigihub/cover.webp", caption: "Home" },
        { src: "/work/prefdigihub/services.webp", caption: "Services" },
        { src: "/work/prefdigihub/ai.webp", caption: "AI search" },
        { src: "/work/prefdigihub/mobile.webp", caption: "Phone", phone: true },
        { src: "/work/prefdigihub/process.webp", caption: "Process" },
        { src: "/work/prefdigihub/case.webp", caption: "A client result" },
        { src: "/work/prefdigihub/compare.webp", caption: "Search vs AI search" },
        { src: "/work/prefdigihub/cta.webp", caption: "Free check" },
      ],
    },
    {
      slug: "agency-concept",
      name: "Marketing agency",
      url: "https://webindiainc.vercel.app/",
      host: "webindiainc.vercel.app",
      sector: "Performance marketing",
      place: "Concept",
      kind: "Concept site",
      summary:
        "A concept site for a performance marketing agency. Reviews, services and answers are arranged so a visitor can go from first scroll to booked call without hunting.",
      role: "Design and development",
      stack: ["Next.js", "TypeScript"],
      tone: "#1f4fd8",
      images: {
        hero: "/work/agency-hero.webp",
        mobile: "/work/agency-mobile.webp",
        alt: "Agency concept home page: the headline “Performance-First Digital Marketing Agency” beside a panel of review counts.",
        mobileAlt: "Agency concept home page on a phone.",
      },
      screens: [
        { src: "/work/agency-hero.webp", caption: "Home" },
        { src: "/work/agency-concept/services.webp", caption: "Services" },
        { src: "/work/agency-mobile.webp", caption: "Phone", phone: true },
        { src: "/work/agency-concept/certifications.webp", caption: "Certifications" },
        { src: "/work/agency-concept/faq.webp", caption: "Answers" },
      ],
    },
  ] satisfies LiveProject[],
  gallery: {
    title: "Every screen",
    note: "All five sites, screen by screen. Scroll and the columns move against each other.",
  },
} as const;

/* ------------------------------------------------------------------ */
/* 02 Engineering: systems, shown as spec sheets                        */
/* ------------------------------------------------------------------ */

/** A schematic drawn in code: boxes on a grid and the arrows between them. */
export type Diagram = {
  nodes: { id: string; col: number; row: number; label: string; sub: string }[];
  /** `hot` edges are the main path and carry the accent colour. */
  edges: { from: string; to: string; hot?: boolean }[];
};

export type SystemProject = {
  index: string;
  title: string;
  /** Case study page, when there is one. */
  slug?: string;
  domain: string;
  nda: boolean;
  line: string;
  role: string;
  problem: string;
  stack: string[];
  facts: { value: string; label: string }[];
  diagram: Diagram;
};

export const engineering = {
  index: "02",
  label: "Engineering",
  meta: "Three under NDA, one personal",
  title: "Systems",
  intro:
    "Production systems for clients in healthcare, commerce and finance. Their names stay private; the architecture and the numbers don’t.",
  stamp: "Under NDA · walkthrough on request",
  projects: [
    {
      index: "02.1",
      title: "Clinical messaging platform",
      slug: "clinical-messaging",
      domain: "Healthcare",
      nda: true,
      line: "HIPAA-compliant, multi-tenant messaging for care teams, with ordered, exactly-once delivery.",
      role: "Fullstack engineering",
      problem: "Realtime messaging for many care organisations, where protected data must never cross between tenants.",
      stack: ["TypeScript", "Node.js", "Socket.IO", "PostgreSQL", "Redis", "Azure"],
      facts: [
        { value: "34", label: "Tables under row-level security" },
        { value: "13", label: "Pub/sub topics with dead-letter queues" },
        { value: "1,313", label: "Automated tests, front and back" },
      ],
      diagram: {
        nodes: [
          { id: "clients", col: 0, row: 0, label: "Clients", sub: "Web · mobile · SSO" },
          { id: "api", col: 1, row: 0, label: "REST API", sub: "Stateless" },
          { id: "bus", col: 2, row: 0, label: "Service Bus", sub: "13 topics · DLQ" },
          { id: "workers", col: 3, row: 0, label: "Workers", sub: "Idempotent · leases" },
          { id: "teams", col: 0, row: 1, label: "Care teams", sub: "Live, in order" },
          { id: "gateway", col: 1, row: 1, label: "Realtime", sub: "Socket.IO · Redis" },
          { id: "db", col: 2, row: 1, label: "Postgres", sub: "Row-level security" },
          { id: "audit", col: 3, row: 1, label: "Audit log", sub: "Append-only" },
        ],
        edges: [
          { from: "clients", to: "api", hot: true },
          { from: "api", to: "gateway", hot: true },
          { from: "gateway", to: "teams", hot: true },
          { from: "api", to: "bus" },
          { from: "bus", to: "workers" },
          { from: "api", to: "db" },
          { from: "db", to: "audit" },
        ],
      },
    },
    {
      index: "02.2",
      title: "AI fashion e-commerce platform",
      slug: "fashion-commerce",
      domain: "Commerce",
      nda: true,
      line: "Search that reads photos, recommendations with reasons, and a catalogue that tags itself.",
      role: "ML/AI and backend engineering",
      problem: "Shoppers search with photos and loose words; keyword search and hand tagging couldn’t keep up.",
      stack: ["Python", "FastAPI", "Elasticsearch", "OpenCLIP", "GPT-4o vision"],
      facts: [
        { value: "15+", label: "FastAPI microservices" },
        { value: "85%+", label: "Search accuracy, under a second" },
        { value: "1,000+", label: "Products tagged automatically" },
      ],
      diagram: {
        nodes: [
          { id: "shoppers", col: 0, row: 0, label: "Shoppers", sub: "A photo or words" },
          { id: "api", col: 1, row: 0, label: "Search API", sub: "15+ FastAPI services" },
          { id: "embed", col: 2, row: 0, label: "Embeddings", sub: "CLIP · transformers" },
          { id: "index", col: 3, row: 0, label: "Vector search", sub: "Elasticsearch 8" },
          { id: "catalogue", col: 0, row: 1, label: "Catalogue", sub: "1,000+ products" },
          { id: "tagging", col: 1, row: 1, label: "Vision tagging", sub: "GPT-4o · OpenCLIP" },
          { id: "recs", col: 2, row: 1, label: "Recommendations", sub: "Meaning · brand · season" },
          { id: "rank", col: 3, row: 1, label: "Ranking", sub: "8 tiers · under 1 s" },
        ],
        edges: [
          { from: "shoppers", to: "api", hot: true },
          { from: "api", to: "embed", hot: true },
          { from: "embed", to: "index", hot: true },
          { from: "index", to: "rank", hot: true },
          { from: "catalogue", to: "tagging" },
          { from: "tagging", to: "embed" },
          { from: "recs", to: "rank" },
        ],
      },
    },
    {
      index: "02.3",
      title: "Trading risk platform",
      slug: "trading-risk",
      domain: "Finance",
      nda: true,
      line: "Risk scores that explain their own reasoning, next to what the market is saying.",
      role: "ML/AI and backend engineering",
      problem: "See risk building before it turns into losses, and explain every score to people who don’t read model weights.",
      stack: ["Python", "XGBoost", "FinBERT", "Celery", "MLflow"],
      facts: [
        { value: "146+", label: "Engineered features" },
        { value: "19,200+", label: "News articles analysed a day" },
        { value: "99.9%", label: "Uptime, with circuit breakers" },
      ],
      diagram: {
        nodes: [
          { id: "news", col: 0, row: 0, label: "News", sub: "30+ sources a day" },
          { id: "sentiment", col: 1, row: 0, label: "Sentiment", sub: "FinBERT · RoBERTa" },
          { id: "features", col: 2, row: 0, label: "Features", sub: "146+ engineered" },
          { id: "ensemble", col: 3, row: 0, label: "Risk ensemble", sub: "XGBoost · forest" },
          { id: "mirror", col: 0, row: 1, label: "Mirror feeds", sub: "Circuit breakers" },
          { id: "retrain", col: 1, row: 1, label: "Weekly retrain", sub: "Celery · Optuna" },
          { id: "desk", col: 2, row: 1, label: "Risk team", sub: "Scores with reasons" },
          { id: "explain", col: 3, row: 1, label: "Explanations", sub: "SHAP · LIME · GPT-4" },
        ],
        edges: [
          { from: "news", to: "sentiment", hot: true },
          { from: "sentiment", to: "features", hot: true },
          { from: "features", to: "ensemble", hot: true },
          { from: "ensemble", to: "explain", hot: true },
          { from: "explain", to: "desk", hot: true },
          { from: "mirror", to: "news" },
          { from: "retrain", to: "ensemble" },
        ],
      },
    },
    {
      index: "02.4",
      title: "Shizuku",
      domain: "Personal project",
      nda: false,
      line: "A studio that turns documents into manga, with a 2.5D engine that keeps scenes consistent across panels.",
      role: "Design and engineering",
      problem: "Turn a document into a manga whose characters and camera angles hold from panel to panel.",
      stack: ["React", "Express", "TypeScript", "Drizzle ORM", "Redis"],
      facts: [
        { value: "16+", label: "Shared packages in one monorepo" },
        { value: "2.5D", label: "Engine for consistent panels" },
        { value: "3", label: "Pipelines: layout, panels, voice" },
      ],
      diagram: {
        nodes: [
          { id: "doc", col: 0, row: 0, label: "Document", sub: "Text in" },
          { id: "layout", col: 1, row: 0, label: "Layout", sub: "Pages and beats" },
          { id: "engine", col: 2, row: 0, label: "2.5D engine", sub: "Characters on a grid" },
          { id: "panels", col: 3, row: 0, label: "Panels", sub: "Scenes that hold" },
          { id: "repo", col: 0, row: 1, label: "Monorepo", sub: "16+ packages" },
          { id: "check", col: 1, row: 1, label: "Copyright check", sub: "Hash-based" },
          { id: "studio", col: 2, row: 1, label: "Studio", sub: "React · Express" },
          { id: "voice", col: 3, row: 1, label: "Voices", sub: "Per character" },
        ],
        edges: [
          { from: "doc", to: "layout", hot: true },
          { from: "layout", to: "engine", hot: true },
          { from: "engine", to: "panels", hot: true },
          { from: "panels", to: "voice", hot: true },
          { from: "voice", to: "studio", hot: true },
          { from: "check", to: "layout" },
        ],
      },
    },
  ] satisfies SystemProject[],
} as const;

/* ------------------------------------------------------------------ */
/* 03 Toolbox: the logo grid                                            */
/* ------------------------------------------------------------------ */

/** Tools actually shipped with. `icon` is a Simple Icons export name. */
export const toolbox = {
  index: "03",
  label: "Toolbox",
  title: "Toolbox",
  note: "The libraries and platforms behind the work above, from the first frame in Figma to the last deploy.",
  tools: [
    { name: "Figma", layer: "Design", icon: "siFigma" },
    { name: "React", layer: "Interface", icon: "siReact" },
    { name: "Next.js", layer: "Interface", icon: "siNextdotjs" },
    { name: "TypeScript", layer: "Language", icon: "siTypescript" },
    { name: "Tailwind CSS", layer: "Interface", icon: "siTailwindcss" },
    { name: "Three.js", layer: "Motion & 3D", icon: "siThreedotjs" },
    { name: "WebGL", layer: "Motion & 3D", icon: "siWebgl" },
    { name: "Vite", layer: "Interface", icon: "siVite" },
    { name: "Node.js", layer: "Server", icon: "siNodedotjs" },
    { name: "Express", layer: "Server", icon: "siExpress" },
    { name: "FastAPI", layer: "Server", icon: "siFastapi" },
    { name: "Python", layer: "Language", icon: "siPython" },
    { name: "PostgreSQL", layer: "Data", icon: "siPostgresql" },
    { name: "MongoDB", layer: "Data", icon: "siMongodb" },
    { name: "Redis", layer: "Data", icon: "siRedis" },
    { name: "Drizzle", layer: "Data", icon: "siDrizzle" },
    { name: "Socket.IO", layer: "Realtime", icon: "siSocketdotio" },
    { name: "Kafka", layer: "Messaging", icon: "siApachekafka" },
    { name: "Celery", layer: "Messaging", icon: "siCelery" },
    { name: "Elasticsearch", layer: "Search", icon: "siElasticsearch" },
    { name: "PyTorch", layer: "AI", icon: "siPytorch" },
    { name: "scikit-learn", layer: "AI", icon: "siScikitlearn" },
    { name: "MLflow", layer: "MLOps", icon: "siMlflow" },
    { name: "LangChain", layer: "AI", icon: "siLangchain" },
    { name: "Claude", layer: "LLMs", icon: "siClaude" },
    { name: "Gemini", layer: "LLMs", icon: "siGooglegemini" },
    { name: "Docker", layer: "Delivery", icon: "siDocker" },
    { name: "GitHub Actions", layer: "Delivery", icon: "siGithubactions" },
    { name: "Vercel", layer: "Cloud", icon: "siVercel" },
    { name: "Azure", layer: "Cloud", icon: null },
    { name: "AWS", layer: "Cloud", icon: null },
    { name: "Sentry", layer: "Monitoring", icon: "siSentry" },
    { name: "Grafana", layer: "Monitoring", icon: "siGrafana" },
    { name: "Turborepo", layer: "Workflow", icon: "siTurborepo" },
    { name: "Vitest", layer: "Testing", icon: "siVitest" },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* 04 About, 05 Contact                                                 */
/* ------------------------------------------------------------------ */

export const about = {
  label: "About",
  title: "About",
  paragraphs: [
    "I’m a computer science engineer from Ahmedabad who works at both ends of a product: the page a customer sees and the system that answers it.",
    "I’ve designed and built websites for manufacturers, brands and agencies, and shipped HIPAA-grade messaging infrastructure and machine-learning pipelines for clients in healthcare, commerce and finance.",
  ],
  experience: [
    { org: "Techuz InfoWeb", role: "Fullstack + AI Engineer", when: "2026" },
    { org: "Demaze Technologies", role: "ML/AI + Fullstack Engineer", when: "2025–26" },
    { org: "Tic-Tech-Toe ’24, DAIICT", role: "Top 5 of 200+ teams, 48-hour hackathon", when: "2024" },
    { org: "LJ Institute of Engineering & Technology", role: "B.E. Computer Science", when: "2026" },
  ],
  resume: "Download résumé (PDF)",
} as const;

export const contact = {
  start: "Start a project",
  copy: "Copy email",
  copied: "Copied",
} as const;

/* ------------------------------------------------------------------ */
/* Case studies                                                         */
/* ------------------------------------------------------------------ */

export type CaseStudy = {
  slug: string;
  title: string;
  /** Client site, concept site, or client work under NDA. */
  kind: string;
  role: string;
  stack: string[];
  /** One line under the title. */
  hook: string;
  /** For search results and link previews. */
  description: string;
  group: "design" | "engineering";
  /** Design projects: the live site, reused as the cover. */
  live?: LiveProject;
  brief: string;
  approach: { title: string; body: string }[];
  inside: { title: string; body: string; image?: { src: string; alt: string } }[];
  factsTitle: string;
  facts: { value: string; label: string }[];
};

const projectOf = (slug: string) => design.projects.find((p) => p.slug === slug);
const TRUVOLT = projectOf("truvolt");
const AGENCY = projectOf("agency-concept");
const SKINROCK = projectOf("skinrock");
const SEOUL = projectOf("seoulceuticals");
const PREF = projectOf("prefdigihub");

export const caseStudies: CaseStudy[] = [
  {
    slug: "truvolt",
    group: "design",
    title: "Truvolt",
    kind: "Client site",
    role: "Design and development",
    stack: ["Next.js", "TypeScript", "Responsive build"],
    hook: "A transformer maker founded in 1970, given a website as exact as its machines.",
    description:
      "Case study: a website for Truvolt, a Kolkata transformer manufacturer, written for engineering buyers who read spec sheets first.",
    live: TRUVOLT,
    brief:
      "Truvolt has built power, distribution and furnace-duty transformers in Kolkata since 1970, for steel plants, refineries and state distribution companies. Its buyers are engineers and procurement teams. Before they ask for a quote they want capacities, voltage classes and standards, and proof that the plant can deliver.",
    approach: [
      { title: "Lead with the spec", body: "The first screen states the range, 25 kVA to 36 MVA up to 66 kV, with three figures before a single adjective." },
      { title: "Show who already relies on it", body: "A wall of more than 100 operators, from public sector majors to EPC contractors and six state distribution companies, that holds a row when you hover or tap it." },
      { title: "Open up the machine", body: "Core, windings, tank, cooling and standards set out as a spec table beside the test process, the way an engineer would check them." },
      { title: "Walk the plant", body: "Manufacturing to commissioning as numbered stages with real photography, so the promise has a place behind it." },
      { title: "One clear next step", body: "Every path ends at the enquiry, with the engineers’ 48 to 72 hour reply stated up front." },
    ],
    inside: [
      {
        title: "Proof before pitch",
        body: "Operators are grouped the way buyers recognise them, industry and EPC first, then distribution companies, each with its sector underneath. It reads like a reference list, because that is what it is.",
        image: { src: "/work/truvolt/clients.webp", alt: "Truvolt client wall: logos of public sector and EPC operators in rows, with a second row of state distribution companies." },
      },
      {
        title: "The spec, in the open",
        body: "Materials and standards sit in a quiet table next to the engineering process, so the page answers the questions a tender asks without a download.",
        image: { src: "/work/truvolt/core.webp", alt: "Truvolt “Built From the Core Outward” section: a specification table beside a quality and testing panel." },
      },
      {
        title: "A plant you can follow",
        body: "Build, inspection, testing and dispatch run as stages joined by a single line, alternating sides as you scroll.",
        image: { src: "/work/truvolt/process.webp", alt: "Truvolt process section: numbered stages for manufacturing and testing, with photographs of the plant." },
      },
    ],
    factsTitle: "What the site carries",
    facts: [
      { value: "25 kVA–36 MVA", label: "range, up to 66 kV" },
      { value: "100+", label: "operators on the client wall" },
      { value: "9", label: "countries served" },
      { value: "55+", label: "years of the company’s history" },
    ],
  },
  {
    slug: "agency-concept",
    group: "design",
    title: "Marketing agency",
    kind: "Concept site",
    role: "Design and development",
    stack: ["Next.js", "TypeScript", "Responsive build"],
    hook: "A concept site for a performance marketing agency, built to turn proof into a booked call.",
    description: "Case study: a concept website for a performance marketing agency, built so proof and services lead straight to a booked call.",
    live: AGENCY,
    brief:
      "A performance marketing agency’s best evidence lives in ad accounts and review platforms, where visitors never see it. The concept: put that proof on the first screen, make six services easy to compare, answer the usual doubts before they come up, and keep one action in reach the whole way down.",
    approach: [
      { title: "Proof first", body: "Review counts from three platforms sit beside the headline, so the claim and the evidence arrive together." },
      { title: "Services as a rail", body: "Google, Bing, Facebook and Amazon ads, SEO and WordPress as numbered cards you can step through, with a short index beside them." },
      { title: "Answer the doubts", body: "A plain-language FAQ covers cost, worth and how to choose an agency, the questions that stall a decision." },
      { title: "One action, always in reach", body: "“Let’s Connect” stays pinned in the header from the first screen to the last." },
    ],
    inside: [
      {
        title: "Six services, one glance",
        body: "Each service gets one card with one promise, and the index on the left shows where you are in the set.",
        image: { src: "/work/agency-concept/services.webp", alt: "Agency concept services section: an index of six services beside a rail of numbered service cards." },
      },
      {
        title: "Doubts, answered in order",
        body: "Numbered questions open in place, so a visitor can scan the list and read only what matters to them.",
        image: { src: "/work/agency-concept/faq.webp", alt: "Agency concept FAQ: a list of numbered questions with the first one open." },
      },
    ],
    factsTitle: "What the site carries",
    facts: [
      { value: "6", label: "services in one rail" },
      { value: "3", label: "review platforms on the first screen" },
      { value: "1", label: "action, pinned throughout" },
    ],
  },
  {
    slug: "skinrock",
    group: "design",
    title: "Skinrock",
    kind: "Brand website",
    role: "Design and development",
    stack: ["Next.js", "TypeScript", "Responsive build"],
    hook: "Real stone, 1.5 mm thin and translucent when lit, presented the way architects judge a material.",
    description:
      "Case study: a website for Skinrock, a Swiss flexible natural stone veneer, built around the material, the collection and the test results architects ask for.",
    live: SKINROCK,
    brief:
      "Skinrock is natural stone split from the block into sheets from 1.5 mm thin, light enough to bend around curves and, in some stones, thin enough to glow when backlit. Architects and designers need to believe three things quickly: it is real stone, it does what it claims, and it has been tested.",
    approach: [
      { title: "Let the material speak first", body: "The first screen is a room clad in stone and one line: “Real stone. Thin enough to let light through.” No feature list until the material has made its case." },
      { title: "Show the bend", body: "A sheet of stone flexes in 3D as you scroll, with the 1.5 mm figure beside it, so the claim is seen rather than read." },
      { title: "Light it from behind", body: "A backlit section shows the translucent stones as lamps, and lists where they go: walls, bars, furniture, ceilings and installations." },
      { title: "A collection you can browse", body: "Forty two stones grouped into slate, quartzite, marble and an acoustic panel, each opening its own range." },
      { title: "Proof for the specifier", body: "Fire, frost, vapour and emission tests from Swiss, German, Austrian and Indian laboratories, set out as a clean table with the standards named." },
    ],
    inside: [
      {
        title: "The bend, in motion",
        body: "The flexibility is the product, so the page shows it: a single sheet curving in space, with the thickness stated underneath.",
        image: { src: "/work/skinrock/bend.webp", alt: "Skinrock “It bends. It is still stone.” section: a sheet of stone veneer curving in 3D above the figure 1.5 mm." },
      },
      {
        title: "Forty two stones",
        body: "A calm, type-led index of the collection on warm paper, so the stones themselves carry the colour.",
        image: { src: "/work/skinrock/collection.webp", alt: "Skinrock collection index: Slate, Quartzite, Marble and Acoustic set in large type with stone counts." },
      },
      {
        title: "Seven reasons, one grid",
        body: "Swiss, thin, flexible, backlit, easy to cut, lighter on resources and long lasting, each one linked to a real project on hover.",
        image: { src: "/work/skinrock/why.webp", alt: "Skinrock “Real stone. Revolutionary flexibility.” grid of reasons: Swiss, 1.5 mm, Curves, Backlit, Diamond, Less and Lasting." },
      },
    ],
    factsTitle: "What the site carries",
    facts: [
      { value: "42", label: "stones in the collection" },
      { value: "1.5 mm", label: "thinnest sheet, about 2.8 kg/m²" },
      { value: "7", label: "independent test standards listed" },
      { value: "10", label: "projects, indoor and outdoor" },
    ],
  },
  {
    slug: "seoulceuticals",
    group: "design",
    title: "SeoulCeuticals",
    kind: "E-commerce storefront",
    role: "Design and development",
    stack: ["HTML", "CSS", "JavaScript", "Responsive build"],
    hook: "A skincare storefront that sells with editorial calm instead of countdown timers.",
    description:
      "Case study: a storefront for SeoulCeuticals, a Korean-inspired skincare brand, pairing editorial typography with the proof shoppers look for.",
    live: SEOUL,
    brief:
      "SeoulCeuticals pairs ingredients from Korean skincare traditions, like snail mucin, PDRN and centella, with modern actives such as retinol, vitamin C and kojic acid. Shoppers comparing serums want to know what is in each formula, whether it works for their skin, and what other people saw, before they add anything to the bag.",
    approach: [
      { title: "Editorial, not loud", body: "A serif and sans pairing on warm paper sets a calm, premium tone: “Skincare, reformulated.” sits where a discount banner usually would." },
      { title: "Explain the pairings", body: "Four formulas, four pairings, each showing the Korean ingredient beside the modern active exactly as it appears in the named product." },
      { title: "Shop by concern", body: "Dark spots, fine lines, glass skin and dryness as a list that filters the formulas tagged for each one." },
      { title: "Proof next to the product", body: "Ratings, review counts and customer before-and-after photos sit beside the products they belong to." },
      { title: "A routine, morning and night", body: "A day and night switch lays out three-step routines, so a single purchase becomes a regimen." },
    ],
    inside: [
      {
        title: "The approach, stated plainly",
        body: "Potent, pure, effective, affordable: four promises set as a quiet list under the brand’s one-line position.",
        image: { src: "/work/seoulceuticals/approach.webp", alt: "SeoulCeuticals approach section: “Korean-inspired ingredients. Modern skincare science.” above a list of four values." },
      },
      {
        title: "Ingredient heritage, modern formulation",
        body: "A dark interlude walks through each pairing one at a time, with the product it belongs to.",
        image: { src: "/work/seoulceuticals/formula.webp", alt: "SeoulCeuticals formula section on a dark background: “Ingredient heritage meets contemporary formulation.”" },
      },
      {
        title: "Morning glow, midnight repair",
        body: "A day and night toggle turns the range into numbered routines you can follow.",
        image: { src: "/work/seoulceuticals/routine.webp", alt: "SeoulCeuticals routine section: “Morning glow, midnight repair.” with a morning and night switch and numbered steps." },
      },
    ],
    factsTitle: "What the site carries",
    facts: [
      { value: "4", label: "ingredient pairings, each tied to a product" },
      { value: "4", label: "skin concerns to shop by" },
      { value: "AM / PM", label: "routines, three steps each" },
      { value: "6,900+", label: "published reviews surfaced" },
    ],
  },
  {
    slug: "prefdigihub",
    group: "design",
    title: "Pref Digi Hub",
    kind: "Agency website",
    role: "Design and development",
    stack: ["Next.js", "TypeScript", "Responsive build"],
    hook: "A growth agency’s site that shows its result before it asks for the call.",
    description:
      "Case study: a website for Pref Digi Hub, a digital growth agency in India and the UAE, with a live enquiry estimate and AI search explained in plain terms.",
    live: PREF,
    brief:
      "Pref Digi Hub runs SEO, AI search visibility, social, paid media, email, web and lead generation for businesses in India and the UAE. Agency sites usually list services and hope. This one needed to show a business owner what growth could look like for them, in their market, before asking them to book an audit.",
    approach: [
      { title: "Say the outcome", body: "“Get found. Get chosen. Get more customers.” Three short lines that a business owner can repeat to a partner." },
      { title: "Make it personal in the hero", body: "Pick an industry and a city, set a monthly budget, and the hero estimates the enquiries that budget could bring, with a clear note that the free audit gives the real numbers." },
      { title: "Seven services, one system", body: "Each service opens to show what it does and what is included, presented as parts of one growth plan rather than a menu." },
      { title: "Explain AI search", body: "A side-by-side of traditional search and AI answers shows why visibility in ChatGPT, Perplexity and Google AI Mode now matters." },
      { title: "A process you can follow", body: "Discover, diagnose, strategise, execute and optimise, shown as five steps that loop." },
    ],
    inside: [
      {
        title: "Everything you need, as one system",
        body: "The services read as a single plan, each one expanding in place with its deliverables.",
        image: { src: "/work/prefdigihub/services.webp", alt: "Pref Digi Hub services section: “Everything you need to build digital growth” with expandable service rows." },
      },
      {
        title: "AI search, made concrete",
        body: "A sample visibility report ranks a brand against competitors across AI platforms, so a new idea has a picture.",
        image: { src: "/work/prefdigihub/ai.webp", alt: "Pref Digi Hub AI search section: “AI search is changing how people find businesses.” beside a sample visibility report." },
      },
      {
        title: "From challenge to growth",
        body: "Five numbered stages turn an agency process into something a client can hold the agency to.",
        image: { src: "/work/prefdigihub/process.webp", alt: "Pref Digi Hub process: “From digital challenges to measurable growth” with numbered stages Discover, Diagnose and Strategize." },
      },
    ],
    factsTitle: "What the site carries",
    facts: [
      { value: "7", label: "services presented as one system" },
      { value: "5", label: "industries in the live estimate" },
      { value: "2", label: "markets, India and the UAE" },
      { value: "5", label: "steps in the growth process" },
    ],
  },
  {
    slug: "clinical-messaging",
    group: "engineering",
    title: "Clinical messaging platform",
    kind: "Client work, under NDA",
    role: "Fullstack engineering",
    stack: ["TypeScript", "Node.js", "Socket.IO", "PostgreSQL", "Redis", "Azure Service Bus", "Azure Container Apps", "Entra ID"],
    hook: "HIPAA-compliant messaging that keeps every message in order, sends it once and seals every tenant off.",
    description: "Case study: a HIPAA-compliant, multi-tenant clinical messaging platform with ordered, exactly-once delivery and database-level tenant isolation.",
    brief:
      "Healthcare teams across many organisations needed realtime messaging on one platform, under HIPAA. Protected data could never cross between tenants, reach a push notification or pass through the API unguarded, and every action had to be auditable.",
    approach: [
      { title: "One image, three entry points", body: "A stateless REST API, a Socket.IO gateway with a Redis adapter for fan-out across replicas, and Service Bus workers, deployed as three independently scaled Azure Container Apps." },
      { title: "Isolation in the database", body: "FORCE row-level security on 34 tables, with the tenant set by SET LOCAL inside each transaction, because session-scoped settings leak between requests under pgBouncer transaction pooling." },
      { title: "Slow work off the request path", body: "Push dispatch, thumbnails, video transcoding and link previews moved onto 13 publish/subscribe topics with dead-letter queues, bounded retries and idempotent consumers." },
      { title: "In order, exactly once", body: "A server-assigned sequence per conversation plus client idempotency keys: a retried send returns the original row, so no conflict-resolution service was needed." },
      { title: "Compliance in the schema", body: "Entra ID single sign-on with hashed sessions revoked per request, push notifications that carry no protected data, 30-minute signed links so the API never proxies protected files, and an append-only, partitioned audit log that rejects UPDATE and DELETE." },
    ],
    inside: [
      { title: "One runner per job", body: "Scheduled work runs on exactly one worker at a time, elected by leases held in the database, so scaling the worker tier never runs a job twice." },
      { title: "Locked-down Azure", body: "VNet-integrated Container Apps, a private endpoint for Redis, secrets from Key Vault through managed identity, and only digest-verified images promoted to production." },
      { title: "Covered by tests", body: "627 backend and 686 frontend tests guard the guarantees above, from row-level policies to message ordering." },
    ],
    factsTitle: "In numbers",
    facts: [
      { value: "34", label: "tables under row-level security" },
      { value: "13", label: "pub/sub topics with dead-letter queues" },
      { value: "1,313", label: "automated tests, front and back" },
      { value: "30 min", label: "lifetime of a signed file link" },
    ],
  },
  {
    slug: "fashion-commerce",
    group: "engineering",
    title: "AI fashion e-commerce platform",
    kind: "Client work, under NDA",
    role: "ML/AI and backend engineering",
    stack: ["Python", "FastAPI", "Elasticsearch 8", "OpenCLIP", "Sentence Transformers", "GPT-4o vision", "LLMs"],
    hook: "The AI behind a fashion store: search that reads photos, recommendations with reasons, and a catalogue that tags itself.",
    description:
      "Case study: the AI layer of a fashion e-commerce platform across 15+ microservices: multimodal search, recommendations with trend forecasting, and automatic product tagging.",
    brief:
      "A fashion store lives or dies on whether shoppers find what they picture. Keyword search couldn’t match a photo or tell that two differently worded descriptions meant the same dress, recommendations had nothing to go on beyond category, and every new product needed tagging by hand.",
    approach: [
      { title: "Split into services", body: "More than 15 FastAPI microservices, so search, recommendations and tagging scale and ship on their own." },
      { title: "Two kinds of meaning", body: "CLIP-based visual search and semantic search over Sentence Transformers, both served from Elasticsearch 8 vector search." },
      { title: "Rank in tiers", body: "An eight-tier ranking blends visual, semantic and catalogue signals, at 85%+ accuracy with sub-second responses." },
      { title: "Recommend with reasons", body: "Multi-factor scoring (35% semantic, 20% brand, 18% category) with seasonal weather and LLM-powered trend forecasting." },
      { title: "Tag without a tagging team", body: "GPT-4o vision extracts wardrobe features and OpenCLIP produces 768-dimension embeddings, tagging more than 1,000 products automatically." },
    ],
    inside: [
      { title: "A photo is a query", body: "Images and text land in the same embedding space, so a picture of a dress finds dresses that look like it, not just ones that share its tags." },
      { title: "Weights you can read", body: "Recommendation weights are explicit numbers, so the business can see and tune why a product was suggested." },
      { title: "Ahead of the season", body: "Seasonal weather and LLM trend forecasting feed the recommendations, so what is suggested changes with what people will actually wear." },
    ],
    factsTitle: "In numbers",
    facts: [
      { value: "15+", label: "FastAPI microservices" },
      { value: "85%+", label: "search accuracy" },
      { value: "<1 s", label: "response time" },
      { value: "1,000+", label: "products tagged automatically" },
    ],
  },
  {
    slug: "trading-risk",
    group: "engineering",
    title: "Trading risk platform",
    kind: "Client work, under NDA",
    role: "ML/AI and backend engineering",
    stack: ["Python", "FastAPI", "XGBoost", "scikit-learn", "FinBERT", "Celery", "MLflow", "Optuna", "SHAP", "LIME"],
    hook: "Risk scores that explain their own reasoning, next to what the market is saying.",
    description: "Case study: a trading risk and market sentiment platform with a three-model ensemble, news sentiment at 19,200+ articles a day and explainable scores.",
    brief:
      "A trading business needed to see risk building in trader behaviour, leverage and volatility before it turned into losses, alongside what the news was saying. The scores had to be explainable to people who don’t read model weights.",
    approach: [
      { title: "Three engines, one score", body: "An ensemble of behavioural XGBoost (40%), leverage random forest (35%) and volatility XGBoost (25%) over 146+ engineered features, at 85 to 92% accuracy." },
      { title: "Served fast", body: "A FastAPI backend with sub-10 ms health checks and 2 to 5 second inference." },
      { title: "Read the market", body: "A companion platform watching 30+ premium sources, including Reuters, Bloomberg and the Economic Times, processing 19,200+ articles a day at 99.9% uptime with mirror-feed fallback and circuit breakers." },
      { title: "Two sentiment models", body: "FinBERT (85% accurate on financial text) and Twitter-RoBERTa, batched and cached, combined into one compound score." },
      { title: "Explain every score", body: "SHAP for global feature importance, LIME for individual cases, and GPT-4 summaries with counterfactuals for executives." },
    ],
    inside: [
      { title: "Models that keep up", body: "Celery retrains the models every week, Optuna tunes them by Bayesian optimisation, and MLflow tracks every experiment." },
      { title: "Built to stay up", body: "If a news feed fails, a mirror takes over and a circuit breaker stops the failure from spreading." },
    ],
    factsTitle: "In numbers",
    facts: [
      { value: "146+", label: "engineered features" },
      { value: "85–92%", label: "ensemble accuracy" },
      { value: "19,200+", label: "news articles a day" },
      { value: "99.9%", label: "uptime" },
    ],
  },
];

export const caseStudyOf = (slug: string) => caseStudies.find((c) => c.slug === slug);

/** The next case in the same group, wrapping round. Design follows home page order. */
export function nextCase(slug: string) {
  const study = caseStudyOf(slug);
  if (!study) return caseStudies[0];
  const order =
    study.group === "design"
      ? design.projects.map((p) => p.slug).filter((s) => caseStudyOf(s))
      : caseStudies.filter((c) => c.group === "engineering").map((c) => c.slug);
  const at = order.indexOf(slug);
  return caseStudyOf(order[(at + 1) % order.length]) ?? caseStudies[0];
}
