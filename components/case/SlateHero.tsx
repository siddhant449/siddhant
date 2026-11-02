import { ViewTransition } from "react";
import Image from "next/image";
import { Slate } from "@/components/cine/Cine";
import { Chrome } from "@/components/work/parts";
import type { CaseStudy } from "@/lib/content";
import styles from "./SlateHero.module.css";

/** The frame's glow: its master at 64px, saturated and already blurred, so drawing it needs no filter. */
const glowOf = (src: string) => src.replace("/img/work/", "/img/work/glow/").replace(/\.jpg$/, ".webp");

/**
 * The opening slate: the title block, and the key frame as the same crisp, front-on screen the
 * work section ends on, lit by a small blurred copy of itself. The picture shares its
 * view-transition name with that screen's, so the browser carries one into the other.
 */
export default function SlateHero({ study }: { study: CaseStudy }) {
  const frame = study.frames[study.keyFrame];
  const take = `TK.${study.code.replace(/\D/g, "").padStart(2, "0")}`;

  return (
    <section className={styles.hero}>
      <div className={styles.block}>
        <Slate scene="SC.03" take={take} label="Case study" className={styles.slate} />
        <p className={styles.code}>{study.code}</p>
        <h1 className={styles.title}>{study.title}</h1>
        <p className={styles.logline}>{study.logline}</p>
        <dl className={styles.facts}>
          <div>
            <dt>Client</dt>
            <dd>{study.client}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{study.role}</dd>
          </div>
        </dl>
        <a href={study.url} target="_blank" rel="noreferrer" className={styles.live}>
          Visit {study.host}
          <span aria-hidden>↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>

      <div className={styles.stage}>
        <div className={styles.glow} aria-hidden>
          <Image src={glowOf(frame.src)} alt="" width={80} height={52} className={styles.glowImg} />
        </div>
        <Chrome host={study.host} className={styles.screen}>
          <ViewTransition name={`work-${study.slug}`} share="morph" default="none">
            <Image
              src={frame.src}
              alt={frame.alt}
              fill
              preload
              quality={85}
              sizes="(min-width: 1024px) 58vw, 92vw"
              className={styles.img}
            />
          </ViewTransition>
        </Chrome>
      </div>
    </section>
  );
}
