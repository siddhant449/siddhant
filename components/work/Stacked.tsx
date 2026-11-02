"use client";

import Image from "next/image";
import Link from "next/link";
import { ViewTransition, useRef } from "react";
import { useScroll } from "motion/react";
import { Slate } from "@/components/cine/Cine";
import LyricLine from "@/components/cine/LyricLine";
import { aSide, type CaseStudy } from "@/lib/content";
import { Chrome, Count, Ctas, Phone, ProjectCopy, SCREEN_SIZES, useOpen } from "./parts";
import styles from "./Stacked.module.css";

/**
 * Phones and short screens: nothing pins. The hook, then each project as one block: slate,
 * title and facts, the hero in a browser frame, a swipeable strip of the other chapters,
 * a phone, and the two calls to action, full width.
 */
export default function Stacked() {
  const titleRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: titleRef, offset: ["start end", "end start"] });
  return (
    <div className={styles.stacked}>
      <div ref={titleRef} className={styles.titleCard}>
        <LyricLine lineId="workIt" as="h2" fallback={scrollYProgress} window={[0.2, 0.5]} className={styles.lyric} />
        <Slate scene="SC.03" take="TK.01" label="A-side" />
      </div>
      {aSide.map((study, i) => (
        <Block key={study.slug} study={study} i={i} />
      ))}
    </div>
  );
}

function Block({ study, i }: { study: CaseStudy; i: number }) {
  const { href, pushing, onClick } = useOpen(study.slug);
  const headingId = `a-side-${study.slug}`;
  const hero = study.frames[0];

  return (
    <article className={styles.block} aria-labelledby={headingId}>
      <div className={styles.head}>
        <Slate scene="SC.03" take={`TK.${String(i + 1).padStart(2, "0")}`} label="A-side" />
        <p className={`label ${styles.code}`}>
          <span className="dot" />
          {study.code}
        </p>
      </div>
      <ProjectCopy study={study} headingId={headingId} />

      <figure className={styles.hero} data-pushing={pushing ? "1" : "0"}>
        <div className={styles.lean}>
          <Chrome host={study.host}>
            <ViewTransition name={`work-${study.slug}`} share="morph" default="none">
              <div className={styles.shot}>
                <Image src={hero.src} alt={hero.alt} fill sizes={SCREEN_SIZES} quality={85} className={styles.img} />
              </div>
            </ViewTransition>
          </Chrome>
          {/* The CTA below is the accessible way in; this is the same link for a thumb on the screen. */}
          <Link href={href} className={styles.hit} tabIndex={-1} aria-hidden onClick={onClick}>
            <span className="sr-only">Open the case study</span>
          </Link>
        </div>
        <figcaption className={styles.caption}>
          <Count n={1} />
          <span>{hero.caption}</span>
        </figcaption>
      </figure>

      <ol className={styles.strip} aria-label={`${study.title}: more of the site`}>
        {study.frames.slice(1).map((f, k) => (
          <li key={f.src} className={styles.cell}>
            <div className={styles.frame}>
              <Image src={f.src} alt={f.alt} fill sizes="(max-width: 1023px) 86vw, 640px" quality={85} className={styles.img} />
            </div>
            <p className={styles.caption}>
              <Count n={k + 2} />
              <span>{f.caption}</span>
            </p>
          </li>
        ))}
      </ol>

      <Phone frame={study.mobile[0]} sizes="(max-width: 1023px) 64vw, 340px" className={styles.phone} />
      <Ctas study={study} onOpen={onClick} stacked className={styles.ctas} />
    </article>
  );
}
