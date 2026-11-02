export const person = {
  name: "Siddhant Kotak",
  role: "Fullstack + AI Engineer",
  city: "Ahmedabad, Gujarat, IN",
  email: "siddharthkotak280@gmail.com",
  github: "https://github.com/SiddhantKotak",
  linkedin: "https://www.linkedin.com/in/siddhant-kotak-07116a208",
  resume: "/docs/siddhant-kotak-resume.pdf",
};

export type Frame = { src: string; alt: string; caption: string; n: string };

export type CaseStudy = {
  code: string;
  slug: string;
  title: string;
  url: string;
  host: string;
  client: string;
  role: string;
  /** One line under the title: what the site had to do. */
  logline: string;
  /** Case-study copy is drafted from the live sites; Siddhant to review and correct. */
  brief: string;
  moves: { title: string; body: string }[];
  /** Desktop frames in page order, for the contact sheet and the sticky screen. */
  frames: Frame[];
  mobile: Frame[];
  /** Index into `frames` circled on the contact sheet. */
  keyFrame: number;
  next: string;
};

export const aSide: CaseStudy[] = [
  {
    code: "A1",
    slug: "truvolt",
    title: "Truvolt Engineering",
    url: "https://truvolt.vercel.app",
    host: "truvolt.vercel.app",
    client: "Transformer manufacturer, Kolkata, since 1970",
    role: "Design, motion and build",
    logline: "Five decades of heavy engineering, made to feel exact rather than old.",
    brief:
      "Truvolt builds power, distribution and furnace-duty transformers from 25 kVA to 36 MVA, up to 66 kV, for utilities and industry in nine countries. The site had to earn the trust of engineers and procurement teams who read specifications for a living.",
    moves: [
      {
        title: "Open on the test bay",
        body: "The page starts the way every Truvolt unit ends: under test. A voltage counter energises before a single spec appears.",
      },
      {
        title: "A name that means something",
        body: "Truvolt is set like a dictionary entry, true voltage, so the brand promise reads as a definition rather than a slogan.",
      },
      {
        title: "Built from the core outward",
        body: "Core stacking, winding and the test bay become a process flow with tabs, followed by the product range and a numbered delivery timeline.",
      },
      {
        title: "Steel-blue and nameplate type",
        body: "A cold steel-blue palette and a tight grotesk, with monospace figures for ratings, so the interface reads like the equipment it sells.",
      },
    ],
    frames: [
      { n: "01", src: "/img/work/truvolt-d0.jpg", alt: "Truvolt homepage: Reliable Power for a World of Industrial Applications, with 36 MVA, 66 kV and 55+ years set as ratings above the plant photograph", caption: "Hero: capacity, voltage class and years, set as ratings" },
      { n: "02", src: "/img/work/truvolt-d1.jpg", alt: "Client wall: Indian Oil, Larsen & Toubro, Tata Motors, NCC and the state distribution companies as cards", caption: "The client wall, PSUs to discoms" },
      { n: "03", src: "/img/work/truvolt-d2.jpg", alt: "Built From the Core Outward: engineering specifications beside a process flow from core stacking to the test bay", caption: "Core stacking, winding, test bay" },
      { n: "04", src: "/img/work/truvolt-d3.jpg", alt: "Product range cards for distribution, power and furnace duty transformers", caption: "The range, as hardware cards" },
      { n: "05", src: "/img/work/truvolt-d4.jpg", alt: "Footprint map with export routes from Kolkata to Asia and Africa", caption: "Every unit, measured from Kolkata" },
      { n: "06", src: "/img/work/truvolt-d5.jpg", alt: "Reliability section as a bento: ISO-certified quality system, type-tested at national labs, electrolytic copper and proposal turnaround", caption: "Proof, set as a bento" },
    ],
    mobile: [
      { n: "M1", src: "/img/work/truvolt-m0.jpg", alt: "Truvolt homepage on a phone", caption: "Hero on a phone" },
      { n: "M2", src: "/img/work/truvolt-m1.jpg", alt: "Truvolt product range on a phone", caption: "The range on a phone" },
    ],
    keyFrame: 0,
    next: "webindia",
  },
  {
    code: "A2",
    slug: "webindia",
    title: "WebIndia Inc.",
    url: "https://webindiainc.vercel.app",
    host: "webindiainc.vercel.app",
    client: "Digital marketing agency, Google Premier Partner",
    role: "Design, motion and build",
    logline: "An agency pitch about clarity, told in a single pen stroke.",
    brief:
      "WebIndia runs SEO, paid ads and web development for clients worldwide, with 16+ years behind it and a Google Premier Partner badge. The site had to sound confident without shouting like every other agency.",
    moves: [
      {
        title: "A tangle that pulls straight",
        body: "The opening is one scribbled pen line that untangles and runs straight across the page into an orange underline: messy marketing, made clear.",
      },
      {
        title: "Serif italic cut into a sans",
        body: "Digital Marketing is set in a serif italic inside a clean sans headline, the one human gesture in an otherwise precise page.",
      },
      {
        title: "Proof, set like a measuring tape",
        body: "Review counts sit on a ruler of ticks, and the Premier Partner badge gets the same hand-drawn orange circle as the hero line.",
      },
      {
        title: "Services as a numbered deck",
        body: "Google Ads, Bing, Facebook, WordPress and Amazon each become a numbered card in a horizontal deck, followed by the numbers that back them up.",
      },
    ],
    frames: [
      { n: "01", src: "/img/work/webindia-d0.jpg", alt: "WebIndia homepage: Performance-First Digital Marketing Agency, with a 680+ reviews panel and a platform marquee", caption: "Hero: the line pulls straight" },
      { n: "02", src: "/img/work/webindia-d1.jpg", alt: "Google Premier Partner badge circled in orange beside the PPC management pitch", caption: "The badge, circled by hand" },
      { n: "03", src: "/img/work/webindia-d2.jpg", alt: "Services as numbered cards for Facebook Ads, SEO and WordPress", caption: "Services as a numbered deck" },
      { n: "04", src: "/img/work/webindia-d3.jpg", alt: "Our Strengths: company figures joined by a hand-drawn line graph", caption: "The numbers, joined by one line" },
      { n: "05", src: "/img/work/webindia-d4.jpg", alt: "Testimonials on navy: three client quotes hung from hand-drawn lines", caption: "Clients, in their words" },
      { n: "06", src: "/img/work/webindia-d5.jpg", alt: "Closing call to action on navy: Let's Make Your Digital Dreams a Reality!", caption: "The close" },
    ],
    mobile: [
      { n: "M1", src: "/img/work/webindia-m0.jpg", alt: "WebIndia homepage on a phone", caption: "Hero on a phone" },
      { n: "M2", src: "/img/work/webindia-m1.jpg", alt: "WebIndia testimonials on a phone", caption: "Testimonials on a phone" },
    ],
    keyFrame: 0,
    next: "truvolt",
  },
];

export const caseStudy = (slug: string) => aSide.find((c) => c.slug === slug);

export const bSide = [
  {
    code: "B1",
    anchor: "messaging",
    title: "Clinical messaging platform",
    line: "A messenger a hospital can trust.",
    where: "Techuz InfoWeb, 2026",
    body:
      "A multi-tenant messenger for care teams, shipped as one container image with three entry points: a stateless REST API, a Socket.IO gateway fanned out over Redis, and Service Bus workers on 13 topics. Every send carries a server-assigned sequence and a client idempotency key, so a retry returns the original message instead of a duplicate. Protected files travel on 30-minute SAS links and never pass through the API.",
    stack: "TypeScript, Node.js, Socket.IO, PostgreSQL, Redis, Azure Container Apps",
  },
  {
    code: "B2",
    anchor: "shizuku",
    title: "Shizuku",
    line: "Turn your documents into manga.",
    where: "Personal project, ongoing",
    body:
      "Shizuku turns ordinary PDFs into manga-inspired reading. Intelligent document processing breaks the text into scenes, and AI image generation draws them as panels, so text-heavy material reads like an illustrated story that is easier to explore and more fun to finish.",
    close: "Read less like a document. Experience more like a story.",
    stack: "React 18, Express, TypeScript, Drizzle ORM, PostgreSQL, Redis",
  },
];

export const hiddenTracks = [
  {
    n: "1",
    text: "Fashion e-commerce search: CLIP visual search and semantic retrieval over Elasticsearch KNN, 85%+ accuracy at sub-second responses across 15+ FastAPI services.",
  },
  {
    n: "2",
    text: "Trading risk platform: a three-model ensemble reading 146+ features for trading risk, beside a sentiment engine processing 19,200+ articles a day.",
  },
];

/**
 * The stack as a call sheet ("day out of days"): each tool credited only in the productions
 * it actually worked on, with what it did there. Sourced from the résumé and from this site's
 * own code. Productions are described, not named.
 */
export type Production = { id: string; title: string; where: string; href: string };

export const productions: Production[] = [
  { id: "film", title: "This film", where: "This portfolio", href: "#top" },
  { id: "messaging", title: "Clinical messaging", where: "Techuz InfoWeb", href: "#b-side" },
  { id: "manga", title: "Shizuku", where: "Personal project", href: "#b-side" },
  { id: "search", title: "Fashion search", where: "Demaze Technologies", href: "#b-side" },
  { id: "risk", title: "Trading risk", where: "Demaze Technologies", href: "#b-side" },
];

export type CastMember = { tool: string; worked: Partial<Record<string, string>> };
export type Department = { name: string; cast: CastMember[] };

export const callSheet: Department[] = [
  {
    name: "Picture and sound",
    cast: [
      { tool: "Next.js", worked: { film: "App Router, cached song lookups, case-study morphs" } },
      { tool: "React", worked: { film: "Every scene", manga: "The studio's interface (React 18)" } },
      { tool: "three.js and React Three Fiber", worked: { film: "Chrome title, screening room, dither portraits" } },
      { tool: "GLSL", worked: { film: "Mist, film weave, the dot screen, the key light" } },
      { tool: "Motion and Lenis", worked: { film: "Scroll timing, letterbox, lyric reveals" } },
      { tool: "Web Audio", worked: { film: "Two-deck director: echo-outs, bass swaps, beat-locked lyrics" } },
    ],
  },
  {
    name: "Languages",
    cast: [
      { tool: "TypeScript", worked: { film: "The whole site", messaging: "API, gateway and workers", manga: "Monorepo across 16+ packages" } },
      { tool: "Python", worked: { search: "15+ FastAPI services", risk: "Models and the inference API" } },
    ],
  },
  {
    name: "Systems",
    cast: [
      { tool: "Node.js", worked: { messaging: "Stateless REST API and Service Bus workers" } },
      { tool: "Socket.IO", worked: { messaging: "Realtime gateway, fanned out over Redis" } },
      { tool: "Express", worked: { manga: "Studio API" } },
      { tool: "FastAPI", worked: { search: "Search and recommendation services", risk: "Inference API, sub-10ms health checks" } },
      { tool: "Celery", worked: { risk: "Weekly retraining" } },
    ],
  },
  {
    name: "Data",
    cast: [
      { tool: "PostgreSQL", worked: { messaging: "FORCE row-level security on 34 tables", manga: "Type-safe schemas with Drizzle" } },
      { tool: "Redis", worked: { messaging: "Socket.IO adapter for multi-replica fan-out", manga: "Sessions and pub/sub" } },
      { tool: "Elasticsearch", worked: { search: "KNN vector search at sub-second responses" } },
    ],
  },
  {
    name: "Cloud",
    cast: [
      { tool: "Azure", worked: { messaging: "Container Apps, Service Bus on 13 topics, Key Vault, Entra ID" } },
      { tool: "Turborepo", worked: { manga: "16+ shared internal packages" } },
    ],
  },
  {
    name: "Machine learning",
    cast: [
      { tool: "OpenCLIP and Sentence Transformers", worked: { search: "Visual and semantic search" } },
      { tool: "GPT-4o vision", worked: { search: "Wardrobe tagging across 1000+ products" } },
      { tool: "XGBoost and scikit-learn", worked: { risk: "Three-model risk ensemble over 146+ features" } },
      { tool: "FinBERT", worked: { risk: "Financial sentiment on 19,200+ articles a day" } },
      { tool: "MLflow and Optuna", worked: { risk: "Experiment tracking and Bayesian tuning" } },
      { tool: "SHAP and LIME", worked: { risk: "Explainability for every risk score" } },
    ],
  },
];

/**
 * The manga studio's page uses freely licensed manga and anime art from Wikimedia Commons, one piece
 * per panel, converted to grayscale and printed as dithered screen-tone (that is the modification).
 * The licences require the credit below; the SA works' derivatives are shared under the same licence.
 */
export type ArtCredit = { src: string; aspect: number; title: string; artist: string; license: string; licenseUrl: string; page: string };

export const mangaArt: ArtCredit[] = [
  {
    src: "/img/manga/eyes.jpg",
    aspect: 2,
    title: "Typische Manga-Augen im Vektor-Stil",
    artist: "Sandra Höfer",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Typische_Manga-Augen_im_Vektor-Stil-1.jpg",
  },
  {
    src: "/img/manga/movement.jpg",
    aspect: 1200 / 1627,
    title: "Manga movement",
    artist: "Julien Jorge",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Manga-movement.png",
  },
  {
    src: "/img/manga/styles.jpg",
    aspect: 1325 / 1352,
    title: "Wikipe-tan in Different Anime Styles",
    artist: "燃灯",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Wikipe-tan_in_Different_Anime_Styles.png",
  },
  {
    src: "/img/manga/sketch.jpg",
    aspect: 1600 / 2568,
    title: "Mitsuo Iso, manga-style sketch",
    artist: "Lighthalzen",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Mitsuo_Iso,_manga-style_sketch.png",
  },
  {
    src: "/img/manga/lineart.jpg",
    aspect: 1600 / 2133,
    title: "Lineart du portrait Manga de Stéphane Belgrand Rousson",
    artist: "LaetiSansFin",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Lineart_du_portrait_Manga_de_Stephane_Belgrand_Rousson.jpg",
  },
];

/** Tools on the résumé that no production above credits; listed, not dropped. */
export const additionalCrew = "JavaScript, SQL, Java, Zod, Knex, MongoDB, Pandas, NumPy, PyTorch, AWS, Docker, TailwindCSS, TanStack Query, Vite";

export const timeline = [
  { when: "Mar 2026 – now", what: "Fullstack + AI Engineer", where: "Techuz InfoWeb" },
  { when: "June 2026", what: "B.E. Computer Science", where: "Lok Jagruti Institute of Engineering and Technology" },
  { when: "Sep 2025 – Feb 2026", what: "ML/AI + Fullstack Engineer", where: "Demaze Technologies" },
  { when: "2024", what: "Top 14 of 200+ teams", where: "Tic-Tech-Toe’24, DAIICT" },
];
