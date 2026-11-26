/**
 * Copy for the Seth Lukin–style hero and footer (components/seth).
 * Layout, type scale and motion are rebuilt from sethlukin.com; the words are Siddhant's.
 * Facts come from lib/content.ts. Lines marked "owner to confirm" are drafts.
 */
import { contact, site } from "@/lib/content";

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
    file: "/seth/hands.webp",
    title: "Michelangelo, The Creation of Adam, c. 1512 (detail of the hands)",
    use: "The two hands drawn as the footer's dot field (cut out from the plaster, on black)",
    source: "https://commons.wikimedia.org/wiki/File:Creation_of_Adam_(Michelangelo)_Detail.jpg",
    licence: "Public domain",
    credit: "Michelangelo Buonarroti, Sistine Chapel ceiling, via Wikimedia Commons",
  },
  {
    file: "AsciiAquarium (components/ui/ascii-aquarium.tsx)",
    title: "Ascii Aquarium",
    use: "The hero background, recoloured to the deep violet palette, with butterflies added",
    source: "https://studios.lou15.com/agents?ref=21st-code",
    licence: "21st.dev community component",
    credit: "Louis Studios",
  },
  {
    file: "/tab/chrysalis-v1.png",
    title: "Late pupa of Charaxes jasius",
    use: "The tab icon while the site is in a background tab (cut out, inked violet)",
    source: "https://commons.wikimedia.org/wiki/File:Late_pupa_of_Charaxes_jasius.jpg",
    licence: "CC0 1.0",
    credit: "Sarah Faulwetter, via Wikimedia Commons",
  },
  {
    file: "/seth/butterfly.webp",
    title: "Papilio neumoegeni Honrath, 1890 (museum specimen)",
    use: "The butterflies over the hero's ASCII aquarium and the tab icon (cut out, inked violet)",
    source: "https://commons.wikimedia.org/wiki/File:Papilio_neumoegeni_Honrath,_1890_(GBIF).jpg",
    licence: "CC0 1.0",
    credit: "Nicole M. Palffy-Muhoray, via GBIF and Wikimedia Commons",
  },

] as const;
