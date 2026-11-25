/**
 * Ember marks: a 24px grid, one 1.5px line, round caps and joins, no fills.
 * Two practices, six sectors, six system details. Each glyph is a list of strokes
 * drawn in order, so a draw-on can stagger them.
 */

export type Stroke =
  | { d: string }
  | { circle: readonly [cx: number, cy: number, r: number] }
  | { rect: readonly [x: number, y: number, w: number, h: number, rx?: number] };

export const glyphs = {
  design: [
    { d: "M4 19 C 8 6, 16 18, 20 5" },
    { d: "M4 19 L 9 13" },
    { circle: [9.6, 12.3, 1.4] },
    { d: "M20 5 L 15 10.5" },
    { circle: [14.4, 11.2, 1.4] },
    { rect: [2.6, 17.6, 2.8, 2.8] },
    { rect: [18.6, 3.6, 2.8, 2.8] },
  ],
  engineering: [
    { rect: [2.75, 3.75, 6.5, 5, 1] },
    { rect: [14.75, 3.75, 6.5, 5, 1] },
    { rect: [8.75, 15.25, 6.5, 5, 1] },
    { d: "M9.25 6.25 H 14.75" },
    { d: "M18 8.75 V 12 H 12 V 15.25" },
    { d: "M6 8.75 V 12 H 12" },
  ],
  manufacturing: [
    { d: "M10.5 3 V 21 M13.5 3 V 21" },
    { d: "M3 4.5 H 6 a 2 2 0 0 1 0 4 a 2 2 0 0 1 0 4 a 2 2 0 0 1 0 4 a 2 2 0 0 1 0 4 H 3" },
    { d: "M21 4.5 H 18 a 2 2 0 0 0 0 4 a 2 2 0 0 0 0 4 a 2 2 0 0 0 0 4 a 2 2 0 0 0 0 4 H 21" },
  ],
  materials: [
    { d: "M3 15 C 8 11, 15 11, 21 15" },
    { d: "M3 18 C 8 14, 15 14, 21 18" },
    { d: "M3 15 V 18 M21 15 V 18" },
    { d: "M8 3 L 9.4 9.4 M12 2.5 V 9 M16 3 L 14.6 9.4" },
  ],
  agencies: [
    { d: "M3 20.25 H 21" },
    { d: "M4 17 L 9 13.5 L 12.5 15.5 L 19 7" },
    { circle: [19, 7, 2.25] },
    { d: "M4 3.75 V 20.25" },
  ],
  healthcare: [
    { d: "M4.5 3.75 h 15 a 1.75 1.75 0 0 1 1.75 1.75 v 9.5 a 1.75 1.75 0 0 1 -1.75 1.75 H 10 l -4.5 3.75 v -3.75 h -1 A 1.75 1.75 0 0 1 2.75 15 V 5.5 A 1.75 1.75 0 0 1 4.5 3.75 z" },
    { d: "M12 7 V 13.5 M8.75 10.25 H 15.25" },
  ],
  commerce: [
    { d: "M3 7 V 3 H 7 M17 3 H 21 V 7 M21 17 V 21 H 17 M7 21 H 3 V 17" },
    { d: "M9.5 6.5 L 7 8.25 L 8.25 11 L 9.25 10.5 V 17.5 H 14.75 V 10.5 L 15.75 11 L 17 8.25 L 14.5 6.5 C 14 7.75, 10 7.75, 9.5 6.5 z" },
  ],
  finance: [
    { d: "M6 3 V 21 M12 2.5 V 15 M18 7 V 21.5" },
    { rect: [4, 7, 4, 9, 0.5] },
    { rect: [10, 5, 4, 6, 0.5] },
    { rect: [16, 10, 4, 8, 0.5] },
  ],
  storefront: [
    { d: "M9.5 2.75 h 5 v 3.5 h -5 z" },
    { d: "M10.5 6.25 V 8.5 H 13.5 V 6.25" },
    { d: "M8 8.5 h 8 a 1.5 1.5 0 0 1 1.5 1.5 v 9.5 a 1.75 1.75 0 0 1 -1.75 1.75 h -7.5 a 1.75 1.75 0 0 1 -1.75 -1.75 v -9.5 A 1.5 1.5 0 0 1 8 8.5 z" },
    { d: "M10 13.5 H 14 M10 16.5 H 12.5" },
  ],
  panels: [
    { d: "M3 3.75 H 21 V 20.25 H 3 Z" },
    { d: "M3 11 L 21 9.5 M13 3.75 L 11.5 10.4 M9.5 10.6 L 8 20.25" },
    { d: "M13 14 c 1.5 -1, 3.5 -1, 5 0.5" },
  ],
  realtime: [
    { circle: [12, 12, 1.75] },
    { d: "M8.1 8.1 a 5.5 5.5 0 0 0 0 7.8 M15.9 8.1 a 5.5 5.5 0 0 1 0 7.8" },
    { d: "M5 5 a 9.9 9.9 0 0 0 0 14 M19 5 a 9.9 9.9 0 0 1 0 14" },
  ],
  isolation: [
    { d: "M12 2.75 L 19.5 5.5 V 11.5 C 19.5 16, 16.25 19.5, 12 21.25 C 7.75 19.5, 4.5 16, 4.5 11.5 V 5.5 Z" },
    { d: "M12 7.5 V 17 M8 10.5 H 16" },
  ],
  vectors: [
    { circle: [14.5, 9.5, 5.75] },
    { circle: [13, 8, 0.6] },
    { circle: [16.5, 9, 0.6] },
    { circle: [14, 12, 0.6] },
    { circle: [5, 17, 0.6] },
    { circle: [8, 20, 0.6] },
    { circle: [4, 6, 0.6] },
    { d: "M10.4 13.6 L 4 20" },
  ],
  models: [
    { circle: [4.5, 7, 1.75] },
    { circle: [4.5, 17, 1.75] },
    { circle: [12, 4.5, 1.75] },
    { circle: [12, 12, 1.75] },
    { circle: [12, 19.5, 1.75] },
    { circle: [19.5, 12, 1.75] },
    { d: "M6.1 6.3 L 10.4 5.2 M6.1 7.8 L 10.4 11.2 M6.1 16.2 L 10.4 12.8 M6.1 17.7 L 10.4 18.8 M13.7 5.4 L 18 11 M13.75 12 H 17.75 M13.7 18.6 L 18 13" },
  ],
} as const satisfies Record<string, readonly Stroke[]>;

export type GlyphName = keyof typeof glyphs;

/** Which mark goes with which sector or system, by the words used in content.ts. */
export const glyphFor = {
  "Industrial manufacturing": "manufacturing",
  "Architectural materials": "materials",
  "Skincare e-commerce": "storefront",
  "Digital growth agency": "agencies",
  "Performance marketing": "agencies",
  Healthcare: "healthcare",
  Commerce: "commerce",
  Finance: "finance",
  "Personal project": "panels",
} as const satisfies Record<string, GlyphName>;
