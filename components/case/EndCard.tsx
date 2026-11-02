import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/lib/content";
import styles from "./EndCard.module.css";

/**
 * The end card: black, the live site, then the next reel. The next study's thumbnail carries
 * that study's view-transition name, so it morphs into the next page's hero.
 */
export default function EndCard({ study, next }: { study: CaseStudy; next?: CaseStudy }) {
  const nextFrame = next?.frames[next.keyFrame];

  return (
    <section className={styles.end} aria-label="End card">
      <a href={study.url} target="_blank" rel="noreferrer" className={styles.visit}>
        Visit live site ↗<span className="sr-only"> (opens in a new tab)</span>
      </a>

      <div className={styles.foot}>
        {next && nextFrame && (
          // Prefetched in full, so the next page commits with the click and the morph can pair.
          <Link href={`/work/${next.slug}`} prefetch className={styles.next}>
            <span className="label">
              <span className="dot" />
              Next project
            </span>
            <ViewTransition name={`work-${next.slug}`} share="morph" default="none">
              <span className={styles.thumb}>
                <Image src={nextFrame.src} alt="" fill sizes="(max-width: 800px) 60vw, 22vw" className={styles.img} />
              </span>
            </ViewTransition>
            <span className={styles.title}>{next.title}</span>
          </Link>
        )}
        <Link href="/#a-side" className={styles.back}>
          Back to the screening room
        </Link>
      </div>
    </section>
  );
}
