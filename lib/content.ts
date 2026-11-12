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
      slug: "webindia",
      name: "WebIndia Inc.",
      url: "https://webindiainc.vercel.app/",
      host: "webindiainc.vercel.app",
      kind: "Digital marketing agency website",
      summary:
        "A new home for a Google Premier Partner agency with 16+ years of client work. Services, reviews and proof are arranged so a visitor can go from first scroll to booked call without hunting for anything.",
      role: "Design and development",
      stack: ["Next.js", "TypeScript", "Responsive build"],
      images: {
        hero: "/work/webindia-hero.webp",
        mobile: "/work/webindia-mobile.webp",
        alt: "WebIndia Inc. home page: the headline “Performance-First Digital Marketing Agency” with a 680+ Upwork reviews panel.",
        mobileAlt: "WebIndia Inc. home page on a phone.",
      },
    },
  ] satisfies LiveProject[],
} as const;

export type PrivateProject = {
  title: string;
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
      title: "Fashion e-commerce search",
      context: "Client work, under NDA",
      line: "Search that understands a photo as well as a phrase.",
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
