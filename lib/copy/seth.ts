/**
 * Copy for the Seth Lukin–style hero and footer (components/seth).
 * Layout, type scale and motion are rebuilt from sethlukin.com; the words are Siddhant's.
 * Facts come from lib/content.ts. Lines marked "owner to confirm" are drafts.
 */
import { contact, design, site } from "@/lib/content";

const subject = (s: string) => `mailto:${site.email}?subject=${encodeURIComponent(s)}`;

export const sethLinks = {
  email: site.email,
  project: subject("New project"),
  linkedin: site.links.linkedin,
  github: site.links.github,
  resume: site.links.resume,
};

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

export const sethHero = {
  /** Read by screen readers as one sentence; the two words are the visible headline. */
  title: "Websites designed for companies that sell on trust. Software engineered for systems that can’t go down.",
  // owner to confirm: adapted from the pitch drafts ("Websites for companies that sell on trust. Software for systems that can't go down.")
  words: ["Websites", "Software"] as const,
  left: ["Designed for companies", "that sell on trust."] as const,
  right: ["Engineered for systems", "that can’t go down."] as const,
  bubble: contact.start, // "Start a project"
  place: "Ahmedabad, IN",
  /** Real mobile screens shown in the pixel phone, in order. */
  screens: [
    { src: "/work/truvolt-mobile.webp", name: "Truvolt" },
    { src: "/work/skinrock/mobile.webp", name: "Skinrock" },
    { src: "/work/seoulceuticals/mobile.webp", name: "SeoulCeuticals" },
    { src: "/work/prefdigihub/mobile.webp", name: "Pref Digi Hub" },
    { src: "/work/agency-mobile.webp", name: "Agency concept" },
  ],
  phoneLabel: `Siddhant’s live websites on a phone: ${design.projects.map((p) => p.name).join(", ")}`,
};

/* ------------------------------------------------------------------ */
/* Footer                                                               */
/* ------------------------------------------------------------------ */

export type Reading = { title: string; author: string; /** optional cover image path or URL */ cover?: string };

/** Listening & Reading widget, after melon.studio's footer. */
export const sethNow = {
  label: "Listening & Reading",
  played: "Last played",
  readingKicker: "Reading",
  // The book he is reading (owner, 2026-11-25). Cover: Picador edition (ISBN 9781529029581), via Open Library Covers.
  reading: { title: "Before the Coffee Gets Cold", author: "Toshikazu Kawaguchi", cover: "/seth/reading-cover.webp" } as Reading | null,
};

export const sethFooter = {
  // owner to confirm
  lines: ["Let’s build", "something solid"] as const,
  start: contact.start, // "Start a project"
  copy: contact.copy, // "Copy email"
  copied: contact.copied, // "Copied"
  place: "Ahmedabad, IN",
  status: "Available",
  links: [
    { label: "LinkedIn", href: site.links.linkedin, external: true },
    { label: "GitHub", href: site.links.github, external: true },
    { label: "Résumé", href: site.links.resume, external: true },
  ],
};

/* ------------------------------------------------------------------ */
/* Third-party assets                                                   */
/* ------------------------------------------------------------------ */

export const credits = [
  {
    file: "/seth/lava.jpg",
    title: "Pahoehoe toe",
    use: "Material for the molten swimmers in the footer's dot field",
    source: "https://commons.wikimedia.org/wiki/File:Pahoehoe_toe.jpg",
    licence: "Public domain (USGS)",
    credit: "Hawaiian Volcano Observatory, U.S. Geological Survey",
  },
  {
    file: "/kit/tex-stone-duo.webp",
    title: "Marble Rock 01",
    use: "Marble pulled through the hero's dithered field (shared kit asset)",
    source: "https://polyhaven.com/a/marble_rock_01",
    licence: "CC0 1.0",
    credit: "Amal Kumar, Poly Haven",
  },
] as const;
