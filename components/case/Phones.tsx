import Image from "next/image";
import type { CaseStudy } from "@/lib/content";
import styles from "./Phones.module.css";

/**
 * The two mobile frames as phones meeting at a corner in two-point perspective: the left one
 * turns toward the key light, the right one turns away into shadow, and both cast shadows
 * onto a floor lit from the left. Flat on small screens and under reduced motion.
 */
export default function Phones({ study }: { study: CaseStudy }) {
  return (
    <section className={styles.section} aria-labelledby="case-phones">
      <h2 id="case-phones" className="label">
        <span className="dot" />
        On a phone
      </h2>
      <div className={styles.row}>
        {study.mobile.map((m, i) => (
          <figure key={m.n} className={styles.phone} data-side={i % 2 ? "away" : "toward"}>
            <div className={styles.stand}>
              <div className={styles.cast} aria-hidden />
              <div className={styles.device}>
                <div className={styles.screen}>
                  <Image src={m.src} alt={m.alt} fill sizes="(max-width: 800px) 44vw, 21vw" className={styles.img} />
                </div>
              </div>
            </div>
            <figcaption className={styles.caption}>
              <span className={styles.n}>{m.n}</span>
              <span>{m.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
