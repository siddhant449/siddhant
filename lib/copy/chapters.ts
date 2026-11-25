/**
 * Copy for the two practices section and the Design and Engineering chapter
 * openers. Facts come from lib/content.ts; lines written for these sections
 * are marked "owner to confirm".
 */
import { design, engineering, type LiveProject } from "@/lib/content";

const live = (slug: string) => design.projects.find((p) => p.slug === slug) as LiveProject;

/* ------------------------------------------------------------------ */
/* Two practices: big statement words in Seth Lukin's style             */
/* ------------------------------------------------------------------ */

export const practices = {
  heading: "Two practices: design and engineering",
  rows: [
    {
      word: design.label, // "Design"
      outcome: "Websites for manufacturers, brands and agencies, written, designed and built end to end.",
      link: { label: "See the websites", href: "#design" },
    },
    {
      word: engineering.label, // "Engineering"
      outcome: "Production systems for healthcare, commerce and finance, built to hold up.", // owner to confirm
      link: { label: "See the systems", href: "#engineering" },
    },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Design chapter (14islands.com home)                                  */
/* ------------------------------------------------------------------ */

export const designChapter = {
  label: design.label,
  sublabel: "Websites for manufacturers, brands and agencies",
  /** Two rows, the ampersand in the soft tone. From "Designed and built end to end". */
  title: { first: "Designed", amp: "&", second: "built" }, // owner to confirm
  /** Rotating statement pairs, adapted from the case-study lines. */
  pairs: [
    ["For manufacturers", "the spec, in the open"],
    ["For brands", "the material speaks first"],
    ["For agencies", "proof before the pitch"],
  ], // owner to confirm
  intro: design.intro,
  introLink: { label: "All five websites", href: "#design-work" }, // owner to confirm
  reelLabel: "The five live sites, one after another",
  reel: design.projects.map((p) => p.images.hero),
  featured: [
    { project: live("truvolt"), device: "monitor" as const, backdrop: "/chapters/plant.webp" },
    { project: live("skinrock"), device: "tablet" as const, backdrop: "/chapters/slate.webp" },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Engineering chapter (area17.com home)                                */
/* ------------------------------------------------------------------ */

export const engineeringChapter = {
  // From engineering.intro, services and the hero door "Systems that hold up."
  statement: "Production systems for clients in healthcare, commerce and finance: AI, backends and realtime, built to hold up.",
  practice:
    "Tested before it ships and watched once it runs. Client names stay under NDA; the architecture and the numbers don’t.", // owner to confirm ("watched" stands for the health checks, uptime and monitoring)
  buttons: [
    { label: "See the systems", href: "#systems" },
    { label: "Request a walkthrough", href: "#contact" }, // owner to confirm
  ],
  systemsTitle: engineering.title,
  systems: engineering.projects,
  nda: engineering.stamp,
} as const;

/* ------------------------------------------------------------------ */
/* Credits for third-party assets                                        */
/* ------------------------------------------------------------------ */

export const credits = [
  {
    asset: "/chapters/plant.webp",
    title: "Peppermint Powerplant (HDRI, tonemapped preview)",
    author: "Andreas Mischok",
    source: "https://polyhaven.com/a/peppermint_powerplant",
    licence: "CC0",
    changes: "Cropped, blurred, Ember duotone and grain",
  },
  {
    asset: "/chapters/slate.webp",
    title: "Castle Wall Slates (texture, diffuse)",
    author: "Rob Tuytel",
    source: "https://polyhaven.com/a/castle_wall_slates",
    licence: "CC0",
    changes: "Cropped, Ember duotone and grain",
  },
] as const;
