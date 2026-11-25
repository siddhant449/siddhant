/** Third-party imagery in public/kit, with source, licence and credit. */

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
  { file: "/kit/hdri-studio", title: "Studio Small 09 (HDRI)", alt: "", source: "https://polyhaven.com/a/studio_small_09", licence: "CC0 1.0", credit: "Sergej Majboroda, Poly Haven", width: 256, height: 128 },
];

/**
 * Siddhant's own screens, stacked in content.ts order (no third-party rights). Only the
 * capabilities "web" figure draws them, greyscale, scrolling at most 1.6 widths down, so
 * they ship pre-greyed at 800px wide and cut to the top 3.2 widths.
 */
export const stackedPages = {
  truvolt: { src: "/kit/page-truvolt.webp", width: 800, height: 2560 },
  skinrock: { src: "/kit/page-skinrock.webp", width: 800, height: 2560 },
} as const;
