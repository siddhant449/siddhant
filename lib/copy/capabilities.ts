/**
 * Copy for the capabilities section at the top of the Engineering chapter
 * (cuberto.com "What we do" rows). Professional service categories, not project
 * specifics; every tag is a term from the résumé's Technical Skills.
 */

export type CapabilityFigure = "web" | "backend" | "queues" | "vectors" | "cloud" | "tenants";

export type Capability = {
  id: string;
  title: string;
  text: string;
  tags: string[];
  /** live canvas figure drawn in the row's media box */
  figure: CapabilityFigure;
  /** archive plate under the figure (see `credits`) */
  plate: string;
};

export const capabilitiesIntro = {
  label: "What I build", // owner to confirm
  // The statement is split so one phrase can carry the Newsreader italic accent.
  statement: ["From the page a customer sees to the system behind it: I design, build and ", "run", " both."], // owner to confirm
} as const;

export const capabilities: Capability[] = [
  {
    id: "web",
    title: "Web development", // owner to confirm
    text: "Fast, accessible websites and web apps in Next.js and React, from marketing sites to dashboards.", // owner to confirm
    tags: ["React", "TypeScript", "TailwindCSS"], // owner to confirm
    figure: "web",
    plate: "/capabilities/drawing-machine.webp",
  },
  {
    id: "backend",
    title: "Backend & APIs", // owner to confirm
    text: "REST and realtime APIs in Node.js and FastAPI, with PostgreSQL and Redis underneath.", // owner to confirm
    tags: ["Node.js", "FastAPI", "PostgreSQL", "Redis"], // owner to confirm
    figure: "backend",
    plate: "/capabilities/caisson-elevation.webp",
  },
  {
    id: "system-design",
    title: "System design", // owner to confirm
    text: "Architectures that scale and recover: queues and retries, multi-tenant data and clear boundaries between services.", // owner to confirm
    tags: ["Pub/sub", "Dead-letter queues", "Idempotency"], // owner to confirm
    figure: "queues",
    plate: "/capabilities/hoist-drawing.webp",
  },
  {
    id: "ai",
    title: "AI & machine learning", // owner to confirm
    text: "Search, recommendations and predictive models that explain their answers and stay current in production.", // owner to confirm
    tags: ["PyTorch", "Scikit-learn", "MLflow"], // owner to confirm
    figure: "vectors",
    plate: "/capabilities/brain.webp",
  },
  {
    id: "cloud",
    title: "Cloud & DevOps", // owner to confirm
    text: "Deployments on Azure and AWS with containers, CI and the monitoring to know when something breaks.", // owner to confirm
    tags: ["Azure", "AWS", "Docker"], // owner to confirm
    figure: "cloud",
    plate: "/capabilities/silk-treatise.webp",
  },
  {
    id: "security",
    title: "Security & compliance", // owner to confirm
    text: "Tenant isolation, single sign-on and audit trails for regulated work such as healthcare.", // owner to confirm
    tags: ["Row-level security", "Entra ID", "Key Vault"], // owner to confirm
    figure: "tenants",
    plate: "/capabilities/banknote-stylus.webp",
  },
];

/** Archive plates in public/capabilities (ink-on-paper treatment of the kit's sources). */
export const credits = [
  {
    asset: "/capabilities/drawing-machine.webp",
    title: "[Man Operating Brush Drawing Machine]",
    author: "Gilbert & Bacon, 1880s",
    source: "https://www.metmuseum.org/art/collection/search/926172",
    licence: "CC0 (The Met Open Access)",
    credit: "The Metropolitan Museum of Art",
  },
  {
    asset: "/capabilities/caisson-elevation.webp",
    title: "Design for a Machine (Plan et élévation de la première caisse, rade de Cherbourg)",
    author: "Anonymous, French, 18th century",
    source: "https://www.metmuseum.org/art/collection/search/351537",
    licence: "CC0 (The Met Open Access)",
    credit: "The Metropolitan Museum of Art, The Elisha Whittelsey Collection, 1962",
  },
  {
    asset: "/capabilities/hoist-drawing.webp",
    title: "Design for a Machine to Raise and Lower Machinery",
    author: "Anonymous, German, 19th century",
    source: "https://www.metmuseum.org/art/collection/search/336933",
    licence: "CC0 (The Met Open Access)",
    credit: "The Metropolitan Museum of Art",
  },
  {
    asset: "/capabilities/brain.webp",
    title: "The base of the brain with part of the medulla oblongata (engraving)",
    author: "Unknown engraver",
    source: "https://wellcomecollection.org/works/xy9r8tfs",
    licence: "Public Domain Mark",
    credit: "Wellcome Collection",
  },
  {
    asset: "/capabilities/silk-treatise.webp",
    title: "Traité de la Fabrication des étoffes de soie",
    author: "Antoine Dufour, 1852–55",
    source: "https://www.metmuseum.org/art/collection/search/229659",
    licence: "CC0 (The Met Open Access)",
    credit: "The Metropolitan Museum of Art",
  },
  {
    asset: "/capabilities/banknote-stylus.webp",
    title: "Stylus of a Machine Used for Engraving Bank notes",
    author: "Cyrus Durand, 19th century",
    source: "https://www.metmuseum.org/art/collection/search/355345",
    licence: "CC0 (The Met Open Access)",
    credit: "The Metropolitan Museum of Art",
  },
] as const;
