/**
 * Third-party imagery in public/kit, with source, licence and credit.
 * Each archive plate ships as three treatments in the Ember palette:
 *   <name>-duo.webp     ink duotone with grain (engravings inverted so the lines glow on ink)
 *   <name>-paper.webp   ink on paper with grain (archive plates only)
 *   <name>-dither.png   8×8 ordered dither, ink #0f0b0a on paper #f6efed
 * Textures ship as -duo.webp and -dither.png.
 */

export type Credit = {
  /** base path without the treatment suffix, e.g. "/kit/arc-telegraph" */
  file: string;
  title: string;
  /** a description for alt text */
  alt: string;
  source: string;
  licence: "CC0 1.0" | "Public Domain Mark";
  credit: string;
  width: number;
  height: number;
};

export const credits: Credit[] = [
  /* Poly Haven, CC0: no credit required, given as a courtesy */
  { file: "/kit/tex-stone", title: "Marble Rock 01", alt: "Veined marble surface", source: "https://polyhaven.com/a/marble_rock_01", licence: "CC0 1.0", credit: "Amal Kumar, Poly Haven", width: 1024, height: 1024 },
  { file: "/kit/hdri-studio", title: "Studio Small 09 (HDRI)", alt: "", source: "https://polyhaven.com/a/studio_small_09", licence: "CC0 1.0", credit: "Sergej Majboroda, Poly Haven", width: 1024, height: 512 },

  /* The Metropolitan Museum of Art, Open Access (isPublicDomain = true) */

  /* Wellcome Collection, Public Domain Mark (credit requested) */
];

export const creditOf = (file: string) => credits.find((c) => c.file === file);

/** Siddhant's own screens, stacked in content.ts order at 1000px wide (no third-party rights). */
export const stackedPages = {
  truvolt: { src: "/kit/page-truvolt.webp", width: 1000, height: 5000 },
  skinrock: { src: "/kit/page-skinrock.webp", width: 1000, height: 4375 },
  seoulceuticals: { src: "/kit/page-seoul.webp", width: 1000, height: 3750 },
  prefdigihub: { src: "/kit/page-pref.webp", width: 1000, height: 4375 },
  "agency-concept": { src: "/kit/page-agency.webp", width: 1000, height: 2500 },
} as const;

export type StackedSlug = keyof typeof stackedPages;
