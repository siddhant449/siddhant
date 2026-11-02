"use client";

import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { useMotionValue } from "motion/react";
import { Slate } from "@/components/cine/Cine";
import LyricLine from "@/components/cine/LyricLine";
import { aSide, type CaseStudy } from "@/lib/content";
import { Chrome, Count, Ctas, HINT, Phone, ProjectCopy, SCREEN_SIZES } from "./parts";
import styles from "./Sheet.module.css";

/**
 * Reduced motion: nothing pins, scrubs or explodes. The hook is set lit, and each project is
 * the desktop's two columns held still: the copy and its calls to action, then the hero
 * screen, with the other chapters and the phones as a contact sheet beneath it.
 */
export default function Sheet() {
  const lit = useMotionValue(1);
  return (
    <div className={styles.sheet}>
      <div className={styles.titleCard}>
        <LyricLine lineId="workIt" as="h2" fallback={lit} window={[0, 0.5]} className={styles.lyric} />
        <Slate scene="SC.03" take="TK.01" label="A-side" />
      </div>
      {aSide.map((study, i) => (
        <Project key={study.slug} study={study} i={i} />
      ))}
    </div>
  );
}

function Project({ study, i }: { study: CaseStudy; i: number }) {
  const headingId = `a-side-${study.slug}`;
  const hero = study.frames[0];
  return (
    <article className={styles.project} aria-labelledby={headingId}>
      <div className={styles.left}>
        <div className={styles.head}>
          <Slate scene="SC.03" take={`TK.${String(i + 1).padStart(2, "0")}`} label="A-side" />
          <p className={`label ${styles.code}`}>
            <span className="dot" />
            {study.code}
          </p>
        </div>
        <ProjectCopy study={study} headingId={headingId} />
        <Ctas study={study} className={styles.ctas} />
        <p className={styles.hint}>{HINT}</p>
      </div>

      <div className={styles.right}>
        <figure className={styles.hero}>
          <div className={styles.screen}>
            <Chrome host={study.host}>
              <ViewTransition name={`work-${study.slug}`} share="morph" default="none">
                <div className={styles.shot}>
                  <Image src={hero.src} alt={hero.alt} fill sizes={SCREEN_SIZES} quality={85} className={styles.img} />
                </div>
              </ViewTransition>
            </Chrome>
            <Link href={`/work/${study.slug}`} className={styles.hit} tabIndex={-1} aria-hidden>
              <span className="sr-only">Open the case study</span>
            </Link>
          </div>
          <figcaption className={styles.caption}>
            <Count n={1} />
            <span>{hero.caption}</span>
          </figcaption>
        </figure>

        <ol className={styles.contact} aria-label={`${study.title}: more of the site`}>
          {study.frames.slice(1).map((f, k) => (
            <li key={f.src}>
              <div className={styles.frame}>
                <Image src={f.src} alt={f.alt} fill sizes="(min-width: 1024px) 20vw, 45vw" quality={85} className={styles.img} />
              </div>
              <p className={styles.caption}>
                <Count n={k + 2} />
                <span>{f.caption}</span>
              </p>
            </li>
          ))}
          <li className={styles.phones}>
            {study.mobile.map((m) => (
              <Phone key={m.src} frame={m} sizes="100px" className={styles.phone} />
            ))}
          </li>
        </ol>
      </div>
    </article>
  );
}
