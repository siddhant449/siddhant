import Image from "next/image";
import type { CaseStudy } from "@/lib/content";
import styles from "./Storyboard.module.css";

/**
 * Which frame illustrates each move, by index into `frames`, chosen by reading the captions
 * and the frames themselves. Unlisted studies fall back to frames in order.
 */
const SHOT_FOR_MOVE: Record<string, number[]> = {
  // Test-bay opening → hero; the name → its definition; core outward → process flow;
  // nameplate type → the range cards with their monospace ratings.
  truvolt: [0, 2, 3, 4],
  // The tangle → hero underline; serif italic → "Why Choose" headline; proof → the circled
  // badge; services → the numbered deck.
  webindia: [0, 3, 1, 2],
};

/** The four moves as storyboard panels: frame, then title, then body. Two up on desktop. */
export default function Storyboard({ study }: { study: CaseStudy }) {
  const shots = SHOT_FOR_MOVE[study.slug] ?? study.moves.map((_, i) => i % study.frames.length);

  return (
    <section className={styles.section} aria-labelledby="case-board">
      <h2 id="case-board" className="label">
        <span className="dot" />
        Storyboard
      </h2>
      <div className={styles.board}>
        {study.moves.map((move, i) => {
          const frame = study.frames[shots[i]];
          return (
            <article key={move.title} className={styles.panel}>
              <div className={styles.shot}>
                <Image src={frame.src} alt={frame.alt} fill sizes="(max-width: 800px) 92vw, 48vw" className={styles.img} />
              </div>
              <div className={styles.text}>
                <p className={styles.no}>
                  Shot <span>{frame.n}</span>
                </p>
                <div>
                  <h3 className={styles.title}>{move.title}</h3>
                  <p className={styles.body}>{move.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
