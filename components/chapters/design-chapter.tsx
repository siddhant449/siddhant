import Image from "next/image";
import type { ReactNode } from "react";
import { designChapter as D } from "@/lib/copy/chapters";
import { ChapterTitle, PairCarousel, Reel } from "./design-parts";
import s from "./design-chapter.module.css";

/**
 * The Design chapter opener, after 14islands.com: label, two-row title,
 * media card, rotating statement, a short paragraph, then two sites in
 * device frames. The page turns paper here (data-theme). `children` (the
 * existing design work) render after the intro, inside the same section.
 */
export function DesignChapter({ children }: { children?: ReactNode }) {
  return (
    <section id="design" data-nav="design" data-theme="paper" aria-labelledby="design-chapter-title">
      <div className={s.wrap}>
        <div className={s.hero}>
          <p className={`t-label ${s.label}`}>
            <span className={`block ${s.soft}`}>{D.label}</span>
            <span className="block">{D.sublabel}</span>
          </p>
          <ChapterTitle id="design-chapter-title" {...D.title} />
        </div>

        <Reel images={D.reel} label={D.reelLabel} />

        <div className={s.intro}>
          <PairCarousel pairs={D.pairs} />
          <div className={s.para}>
            <p className={s.paraText}>{D.intro}</p>
            <a className={s.paraLink} href={D.introLink.href}>
              {D.introLink.label}
            </a>
          </div>
        </div>

        <div className={s.grid}>
          {D.featured.map(({ project: p, device, backdrop }) => (
            <a key={p.slug} className={s.card} href={`/work/${p.slug}`}>
              <div className={s.scene}>
                <Image src={backdrop} alt="" fill sizes="(min-width: 760px) 46vw, 92vw" className={`${s.bg} object-cover`} />
                {device === "monitor" ? (
                  <div className={s.monitor}>
                    <div className={s.screen}>
                      <Image src={p.images.hero} alt={p.images.alt} fill sizes="(min-width: 760px) 27vw, 54vw" className="object-cover object-top" />
                    </div>
                    <div className={s.neck} />
                    <div className={s.foot} />
                  </div>
                ) : (
                  <div className={s.tablet}>
                    <Image src={p.images.hero} alt={p.images.alt} fill sizes="(min-width: 760px) 30vw, 60vw" className="object-cover object-top" />
                  </div>
                )}
              </div>
              <h3 className={s.caption}>
                {p.name} <span className={s.soft}>— {p.sector}</span>
              </h3>
            </a>
          ))}
        </div>
      </div>
      <div id="design-work">{children}</div>
    </section>
  );
}
