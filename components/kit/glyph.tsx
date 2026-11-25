import { glyphs, type GlyphName } from "@/lib/kit/glyphs";
import styles from "./kit.module.css";

/**
 * An Ember mark: 24px grid, 1.5px line at any size. With `draw`, the strokes draw on
 * as the mark scrolls into view (CSS scroll timeline; drawn outright where unsupported
 * and under reduced motion). Decorative unless given a `title`.
 */
export function Glyph({
  name,
  size = 24,
  className,
  draw = false,
  title,
}: {
  name: GlyphName;
  /** px, or any CSS length (a draw-on keeps 1.5px only with a px number) */
  size?: number | string;
  className?: string;
  draw?: boolean;
  title?: string;
}) {
  /* a draw-on needs dash lengths in path units, so the stroke can't be non-scaling there:
     hold it at 1.5px by scaling the width instead */
  const width = draw && typeof size === "number" ? (1.5 * 24) / size : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`${styles.glyph} ${draw ? styles.draw : styles.fixed} ${className ?? ""}`}
      style={width ? { strokeWidth: width } : undefined}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {glyphs[name].map((s, i) =>
        "d" in s ? (
          <path key={i} d={s.d} pathLength={1} />
        ) : "circle" in s ? (
          <circle key={i} cx={s.circle[0]} cy={s.circle[1]} r={s.circle[2]} pathLength={1} />
        ) : (
          <rect key={i} x={s.rect[0]} y={s.rect[1]} width={s.rect[2]} height={s.rect[3]} rx={s.rect[4]} pathLength={1} />
        ),
      )}
    </svg>
  );
}
