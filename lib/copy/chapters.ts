/**
 * Copy for the two practices section and the Engineering chapter opener. Facts come from
 * lib/content.ts; lines written for these sections are marked "owner to confirm".
 */
import { design, engineering } from "@/lib/content";

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
/* Engineering chapter (area17.com home)                                */
/* ------------------------------------------------------------------ */

export const engineeringChapter = {
  // From engineering.intro, services and the hero door "Systems that hold up."
  statement: "Production systems for clients in healthcare, commerce and finance: AI, backends and realtime, built to hold up.",
  practice:
    "Tested before it ships and watched once it runs. Client names stay under NDA; the architecture and the numbers don’t.", // owner to confirm ("watched" stands for the health checks, uptime and monitoring)
  systemsTitle: engineering.title,
  systems: engineering.projects,
  nda: engineering.stamp,
} as const;
