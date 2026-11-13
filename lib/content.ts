/**
 * Every word on the site lives here.
 *
 * Client work done at an employer is described by what it does, never by its
 * product name. Keep it that way when editing.
 */

export const site = {
  name: "Siddhant Kotak",
  shortName: "Siddhant",
  role: "Fullstack & AI Engineer",
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
    "Siddhant Kotak is a fullstack and AI engineer in Ahmedabad who designs and builds websites, web apps and AI features end to end, from the first pixel to the last packet.",
} as const;

export const nav = [
  { label: "Work", href: "#work" },
  { label: "Stack", href: "#stack" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
] as const;

export const hero = {
  surface: "Polished on the surface.",
  depth: "Engineered all the way down.",
  intro:
    "I’m Siddhant, a fullstack and AI engineer in Ahmedabad. I design and build websites, web apps and AI features end to end, from the first pixel to the last packet.",
  primaryCta: "Start a project",
  secondaryCta: "See the work",
} as const;

export const manifesto =
  "A beautiful site that buckles under real traffic is a liability. A rock-solid system nobody enjoys using is a missed sale. I build the version where you don’t have to choose.";

export type LiveProject = {
  slug: string;
  name: string;
  url: string;
  host: string;
  kind: string;
  summary: string;
  role: string;
  stack: string[];
  images: {
    hero: string;
    mobile: string;
    alt: string;
    mobileAlt: string;
  };
};

export const liveWork = {
  title: "Work you can click.",
  note: "Both are live. Open them, resize them, try to break them.",
  projects: [
    {
      slug: "truvolt",
      name: "Truvolt",
      url: "https://truvolt.vercel.app/",
      host: "truvolt.vercel.app",
      kind: "Industrial manufacturer website",
      summary:
        "A site for a Kolkata transformer maker founded in 1970. It walks engineering buyers through a range from 25 kVA to 36 MVA, the plant that builds it and the 100+ operators who run on it, in the exact, unhurried voice the product deserves.",
      role: "Design and development",
      stack: ["Next.js", "TypeScript", "Responsive build"],
      images: {
        hero: "/work/truvolt-hero.webp",
        mobile: "/work/truvolt-mobile.webp",
        alt: "Truvolt home page: the headline “Reliable Power for a World of Industrial Applications” beside capacity figures and a photograph of a power transformer.",
        mobileAlt: "Truvolt home page on a phone.",
      },
    },
    {
      slug: "agency-concept",
      name: "Marketing agency",
      url: "https://webindiainc.vercel.app/",
      host: "webindiainc.vercel.app",
      kind: "Digital marketing agency, concept site",
      summary:
        "A concept site for a performance marketing agency. Reviews, services and answers are arranged so a visitor can go from first scroll to booked call without hunting for anything.",
      role: "Design and development",
      stack: ["Next.js", "TypeScript", "Responsive build"],
      images: {
        hero: "/work/agency-hero.webp",
        mobile: "/work/agency-mobile.webp",
        alt: "Agency concept home page: the headline “Performance-First Digital Marketing Agency” beside a panel of review counts.",
        mobileAlt: "Agency concept home page on a phone.",
      },
    },
  ] satisfies LiveProject[],
} as const;

export type PrivateProject = {
  title: string;
  /** Case study page, when there is one. */
  slug?: string;
  context: string;
  line: string;
  facts: { value: string; label: string }[];
  detail: string;
  stack: string[];
};

export const privateWork = {
  title: "The rest runs behind logins and NDAs.",
  note: "Client names stay private. The engineering doesn’t have to.",
  projects: [
    {
      title: "Clinical messaging platform",
      slug: "clinical-messaging",
      context: "Client work, under NDA",
      line: "HIPAA-compliant, multi-tenant messaging for healthcare teams.",
      facts: [
        { value: "34", label: "tables sealed by row-level security" },
        { value: "13", label: "pub/sub topics with dead-letter queues" },
        { value: "1,313", label: "automated tests, front and back" },
      ],
      detail:
        "One container image, three entry points: a stateless API, a realtime gateway that fans out across replicas, and background workers, each scaled on its own. Messages arrive in order and exactly once, protected files are served through 30-minute signed links, and the audit log refuses to be edited.",
      stack: ["TypeScript", "Node.js", "Socket.IO", "PostgreSQL", "Redis", "Azure"],
    },
    {
      title: "AI fashion e-commerce platform",
      slug: "fashion-commerce",
      context: "Client work, under NDA",
      line: "Search, recommendations and tagging that understand what a product looks like.",
      facts: [
        { value: "15+", label: "FastAPI microservices" },
        { value: "85%+", label: "search accuracy, under a second" },
        { value: "1,000+", label: "products tagged by a vision model" },
      ],
      detail:
        "Visual search on CLIP embeddings and semantic search on sentence transformers, served from Elasticsearch vector search and ranked in eight tiers. Recommendations weigh meaning, brand, category and even the season’s weather.",
      stack: ["Python", "FastAPI", "Elasticsearch", "OpenCLIP", "GPT-4o vision"],
    },
    {
      title: "Trading risk platform",
      slug: "trading-risk",
      context: "Client work, under NDA",
      line: "Risk scores that explain their own reasoning.",
      facts: [
        { value: "146+", label: "engineered features, three-model ensemble" },
        { value: "19,200+", label: "news articles analysed a day" },
        { value: "99.9%", label: "uptime with circuit-breaker fallbacks" },
      ],
      detail:
        "An XGBoost and random-forest ensemble scores trading risk at 85 to 92% accuracy, while FinBERT reads the market’s mood. SHAP, LIME and plain-language summaries tell a human why, and the models retrain themselves every week.",
      stack: ["Python", "XGBoost", "FinBERT", "Celery", "MLflow", "Optuna"],
    },
    {
      title: "Shizuku",
      context: "Personal project",
      line: "A studio that turns documents into manga.",
      facts: [
        { value: "16+", label: "shared packages in one monorepo" },
        { value: "2.5D", label: "spatial engine for consistent panels" },
        { value: "3", label: "generation pipelines: layout, panels, voice" },
      ],
      detail:
        "Characters are mapped to grid coordinates so camera angles and scene continuity hold across a whole page of panels. Text becomes layout, layout becomes panels, panels get voices, with hash-based copyright checks along the way.",
      stack: ["React", "Express", "TypeScript", "Drizzle ORM", "PostgreSQL", "Redis"],
    },
  ] satisfies PrivateProject[],
} as const;

export type StackLayer = {
  name: string;
  /** Short name for the isometric slab label. */
  short: string;
  promise: string;
  proof: string;
  groups: { label: string; tools: string[] }[];
};

export const stack = {
  title: ["From pixel", "to packet."],
  intro:
    "Everything between a tap on the screen and a packet leaving the data centre, and the tools I reach for at every layer.",
  layers: [
    {
      name: "Interface",
      short: "Interface",
      promise: "Interfaces that feel fast, look like you and move with intent.",
      proof: "The page you’re reading: Next.js, Motion, Lenis and a hand-written GLSL shader.",
      groups: [
        { label: "Design", tools: ["Figma", "Claude Design"] },
        { label: "Build", tools: ["React", "Next.js", "Tailwind CSS", "TanStack Query", "Vite"] },
        {
          label: "Motion & 3D",
          tools: ["Motion", "Lenis", "Three.js", "React Three Fiber", "GLSL", "Web Audio API"],
        },
      ],
    },
    {
      name: "System Design",
      short: "Systems",
      promise: "Built for the day traffic spikes and nothing is allowed to drop.",
      proof: "34 tables sealed by row-level security, 13 topics with dead-letter queues, and every message delivered exactly once.",
      groups: [
        { label: "Messaging", tools: ["Kafka", "Azure Service Bus", "Celery", "Redis pub/sub"] },
        { label: "Realtime & search", tools: ["Socket.IO", "Redis", "Elasticsearch"] },
        {
          label: "Patterns",
          tools: [
            "Microservices",
            "Event-driven design",
            "Dead-letter queues",
            "Idempotent consumers",
            "Exactly-once delivery",
            "Leader election",
            "Row-level security",
          ],
        },
      ],
    },
    {
      name: "Fullstack",
      short: "Fullstack",
      promise: "Typed from the database to the button, so whole classes of bugs never ship.",
      proof: "1,313 automated tests across the front and back end of a single platform.",
      groups: [
        { label: "Languages", tools: ["TypeScript", "Python", "SQL", "JavaScript", "Java"] },
        { label: "Server", tools: ["Node.js", "Express 5", "FastAPI", "Zod", "REST APIs"] },
        { label: "Data", tools: ["PostgreSQL", "MongoDB", "Drizzle ORM", "Knex"] },
        { label: "Workflow", tools: ["Turborepo", "Vitest", "Pytest"] },
      ],
    },
    {
      name: "AI",
      short: "AI",
      promise: "Models that reach production and can explain their answers.",
      proof: "Multimodal search at 85%+ accuracy in under a second, and risk models at 85–92% that show their reasoning.",
      groups: [
        { label: "LLMs", tools: ["GPT", "Claude", "Gemini", "LangChain", "RAG"] },
        { label: "Retrieval", tools: ["Embeddings", "Vector search", "OpenCLIP", "Sentence Transformers"] },
        { label: "Machine learning", tools: ["PyTorch", "Deep learning", "XGBoost", "scikit-learn", "FinBERT"] },
        { label: "MLOps", tools: ["MLflow", "Optuna", "SHAP", "LIME"] },
      ],
    },
    {
      name: "Cloud & Deployment",
      short: "Cloud",
      promise: "Deploys that are boring, in the best possible way.",
      proof: "Private networking, secrets in Key Vault through managed identity, and only digest-verified images reach production.",
      groups: [
        { label: "AWS", tools: ["EC2", "S3", "ECS", "Lambda"] },
        { label: "Azure", tools: ["Container Apps", "Key Vault", "Blob Storage", "Entra ID", "API Management"] },
        { label: "Delivery", tools: ["Docker", "GitHub Actions", "Nginx", "Vercel"] },
        { label: "Monitoring", tools: ["Sentry", "Grafana", "Prometheus", "ELK stack"] },
      ],
    },
  ] satisfies StackLayer[],
} as const;

export const services = {
  title: "What you can hire me for.",
  items: [
    {
      name: "Websites that sell",
      body: "Marketing sites with a point of view: fast, findable, and built to turn a visit into an enquiry.",
      tags: ["Design", "Next.js", "SEO", "Motion"],
    },
    {
      name: "Web apps & dashboards",
      body: "Product interfaces with real state, auth and data behind them, shaped around the people who use them every day.",
      tags: ["React", "TypeScript", "TanStack Query"],
    },
    {
      name: "AI features",
      body: "Semantic and visual search, recommendations and explainable models that ship to production, not just to a demo.",
      tags: ["Embeddings", "LLMs", "Python"],
    },
    {
      name: "Backends & realtime",
      body: "APIs, queues and multi-tenant data models that stay correct when traffic, teams and tenants multiply.",
      tags: ["Node.js", "PostgreSQL", "Azure"],
    },
  ],
} as const;

export const about = {
  title: "The short version.",
  paragraphs: [
    "I’m a computer science engineer from Ahmedabad who enjoys both ends of the stack equally, and the seam between them most of all.",
    "I’ve shipped HIPAA-grade messaging infrastructure, machine-learning pipelines that retrain themselves every week, and marketing sites people actually enjoy scrolling. The common thread is care for the details users feel and the ones they never see.",
  ],
  experience: [
    { org: "Techuz InfoWeb", role: "Fullstack + AI Engineer", when: "2026" },
    { org: "Demaze Technologies", role: "ML/AI + Fullstack Engineer", when: "2025–26" },
    { org: "Tic-Tech-Toe ’24, DAIICT", role: "Top 5 of 200+ teams, 48-hour hackathon", when: "2024" },
    { org: "LJ Institute of Engineering & Technology", role: "B.E. Computer Science", when: "2026" },
  ],
} as const;

export const contact = {
  title: "Got something worth building?",
  body: "Tell me what you’re making and where it hurts. I’ll tell you honestly how I’d build it.",
  copy: "Copy email",
  copied: "Copied",
  backToTop: "Back to top",
  signature: "Designed and built by Siddhant in Ahmedabad.",
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
  /** Live projects only: the frame on the home page, reused as the cover. */
  live?: LiveProject;
  brief: string;
  approach: { title: string; body: string }[];
  inside: { title: string; body: string; image?: { src: string; alt: string } }[];
  factsTitle: string;
  facts: { value: string; label: string }[];
  next: string;
};

const [TRUVOLT, AGENCY] = liveWork.projects;

export const caseStudies: CaseStudy[] = [
  {
    slug: "truvolt",
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
    next: "agency-concept",
  },
  {
    slug: "agency-concept",
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
    next: "clinical-messaging",
  },
  {
    slug: "clinical-messaging",
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
    next: "fashion-commerce",
  },
  {
    slug: "fashion-commerce",
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
    next: "trading-risk",
  },
  {
    slug: "trading-risk",
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
    next: "truvolt",
  },
];

export const caseStudyOf = (slug: string) => caseStudies.find((c) => c.slug === slug);
