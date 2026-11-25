"use client";

import Image from "next/image";
import Link from "next/link";
import { engineering, type CaseStudy } from "@/lib/content";
import { BackLink } from "../back-link";
import { Board } from "../board";
import { Diagram } from "../diagram";
import { MoreWork } from "../more-work";
import { Fade, Opener, Rise, Unveil } from "../ui/reveal";
import { ScrollRead } from "../ui/text-effects";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

function Header({ study }: { study: CaseStudy }) {
  const isDesign = study.group === "design";
  return (
    <header data-theme="ink" className="px-gutter pb-[clamp(48px,6vw,88px)] pt-[clamp(112px,16vh,150px)]">
      <div className="intro-up mb-10" style={d(0.05)}>
        <BackLink fallback={isDesign ? "/#design" : "/#engineering"} label={isDesign ? "Back to design work" : "Back to engineering"} />
      </div>
      <div className="intro-up" style={d(0.1)}>
        <Opener label={isDesign ? "Design" : "Engineering"} meta={study.kind} />
      </div>
      <h1 className="t-display mt-[clamp(32px,6vh,72px)]">
        <span className="intro-mask">
          <span className="intro-heat" style={d(0.15)}>
            {study.title}
          </span>
        </span>
      </h1>
      <div className="mt-[clamp(28px,4vw,56px)] grid gap-x-6 gap-y-10 md:grid-cols-12">
        <p className="t-h2 intro-up max-w-[26ch] md:col-span-7" style={d(0.45)}>
          {study.hook}
        </p>
        <div className="intro-up md:col-span-4 md:col-start-9" style={d(0.6)}>
          <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-3 border-t border-fg/22 pt-4 t-small">
            <dt className="t-label mute pt-0.5">Role</dt>
            <dd>{study.role}</dd>
            <dt className="t-label mute pt-0.5">Type</dt>
            <dd>{study.kind}</dd>
            <dt className="t-label mute pt-0.5">Built with</dt>
            <dd>{study.stack.join(", ")}</dd>
          </dl>
          {study.live ? (
            <a href={study.live.url} target="_blank" rel="noreferrer" className="btn btn-solid mt-7">
              Visit the live site
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <p className="t-label mt-7 inline-block rounded-md border border-dashed border-fg/38 px-2.5 py-2">{engineering.stamp}</p>
          )}
        </div>
      </div>
    </header>
  );
}

/** Design: the live site on its board. Engineering: the architecture and the numbers. */
function Cover({ study }: { study: CaseStudy }) {
  if (study.live) {
    return (
      <section aria-label="The live site" data-theme="ink" className="px-gutter">
        <a href={study.live.url} target="_blank" rel="noreferrer" className="block">
          <span className="sr-only">Open the live site in a new tab</span>
          <Board project={study.live} />
        </a>
        <p className="t-label mute mt-4 text-right">{study.live.host}</p>
      </section>
    );
  }
  const system = engineering.projects.find((p) => p.slug === study.slug);
  return (
    <section aria-label="Architecture" data-theme="paper" className="px-gutter py-[clamp(56px,7vw,104px)]">
      <div className="rounded-2xl bg-[#fbf8f6] p-[clamp(20px,2.6vw,40px)] text-ink ring-1 ring-ink/12">
        <p className="t-label mute">Architecture, simplified · names withheld</p>
        <div className="mt-6">{system ? <Diagram data={system.diagram} label={`${study.title}: architecture`} /> : null}</div>
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink/12 pt-6 lg:grid-cols-4">
          {study.facts.map((f) => (
            <div key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="block text-[clamp(2rem,3.6vw,3.75rem)] font-light leading-none tracking-[-0.045em]">{f.value}</span>
                <span className="t-label mute mt-3 block max-w-[24ch]">{f.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Brief({ study }: { study: CaseStudy }) {
  return (
    <section aria-labelledby="brief-title" className="px-gutter pt-[var(--section)]">
      <Opener label="The brief" />
      <div className="mt-10 grid gap-x-6 gap-y-6 md:grid-cols-12">
        <h2 id="brief-title" className="sr-only">
          The brief
        </h2>
        <ScrollRead text={study.brief} className="t-h2 max-w-[34ch] md:col-span-9 md:col-start-4" />
      </div>
    </section>
  );
}

function Approach({ study }: { study: CaseStudy }) {
  return (
    <section aria-labelledby="approach-title" className="px-gutter pt-[var(--section)]">
      <Opener label="What I did" />
      <h2 id="approach-title" className="sr-only">
        What I did
      </h2>
      <ol className="mt-4">
        {study.approach.map((step) => (
          <Fade as="li" key={step.title} className="grid gap-x-6 gap-y-2 border-b border-fg/12 py-[clamp(22px,2.6vw,36px)] md:grid-cols-12">
            <h3 className="t-h3 md:col-span-5">{step.title}</h3>
            <p className="t-small mute max-w-[60ch] md:col-span-7">{step.body}</p>
          </Fade>
        ))}
      </ol>
    </section>
  );
}

function Inside({ study }: { study: CaseStudy }) {
  const withImages = study.inside.some((b) => b.image);
  return (
    <section aria-labelledby="inside-title" className="px-gutter pt-[var(--section)]">
      <Opener label="A closer look" />
      <h2 id="inside-title" className="sr-only">
        A closer look
      </h2>
      {withImages ? (
        <div className="mt-[clamp(40px,5vw,72px)] space-y-[clamp(64px,8vw,128px)]">
          {study.inside.map((block, i) => (
            <article key={block.title} className="grid items-center gap-x-6 gap-y-8 md:grid-cols-12">
              {block.image ? (
                <Unveil className={`md:col-span-8 ${i % 2 ? "md:order-2 md:col-start-5" : ""}`}>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface ring-1 ring-fg/12">
                    <Image src={block.image.src} alt={block.image.alt} fill sizes="(min-width: 768px) 62vw, 100vw" className="object-cover object-top" />
                  </div>
                </Unveil>
              ) : null}
              <Fade delay={0.1} className={`md:col-span-4 ${i % 2 ? "md:order-1 md:col-start-1" : ""}`}>
                <h3 className="t-h3">{block.title}</h3>
                <p className="t-small mute mt-3 max-w-[40ch]">{block.body}</p>
              </Fade>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-[clamp(40px,5vw,72px)] grid gap-x-6 gap-y-12 md:grid-cols-3">
          {study.inside.map((block, i) => (
            <Fade key={block.title} delay={i * 0.06} className="border-t border-fg/12 pt-6">
              <h3 className="t-h3">{block.title}</h3>
              <p className="t-small mute mt-3 max-w-[40ch]">{block.body}</p>
            </Fade>
          ))}
        </div>
      )}
      <Fade className="mt-[clamp(48px,6vw,96px)]">
        <ul className="flex flex-wrap gap-1.5" aria-label="Built with">
          {study.stack.map((tool) => (
            <li key={tool} className="t-label rounded-md border border-fg/22 px-2.5 py-[7px] text-[11px]">
              {tool}
            </li>
          ))}
        </ul>
      </Fade>
    </section>
  );
}

/** Design work only: engineering shows its numbers beside the architecture. */
function Facts({ study }: { study: CaseStudy }) {
  if (!study.live) return null;
  return (
    <section data-theme="paper" aria-labelledby="facts-title" className="mt-[var(--section)] px-gutter py-[var(--section)]">
      <Opener label={study.factsTitle} />
      <h2 id="facts-title" className="sr-only">
        {study.factsTitle}
      </h2>
      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {study.facts.map((f, i) => (
          <Fade key={f.label} delay={i * 0.06} className="border-t border-fg/22 pt-5">
            <dt className="sr-only">{f.label}</dt>
            <dd>
              <span className="block text-[clamp(2.2rem,4vw,4.25rem)] font-light leading-none tracking-[-0.045em]">{f.value}</span>
              <span className="t-label mute mt-3 block max-w-[22ch]">{f.label}</span>
            </dd>
          </Fade>
        ))}
      </dl>
    </section>
  );
}

function Next({ next }: { next: CaseStudy }) {
  return (
    <section data-theme="ink" aria-label="Next case study" className="px-gutter pt-[var(--section)]">
      <Link href={`/work/${next.slug}`} className="group block border-t border-fg/22 pt-6">
        <span className="t-label mute">Next {next.group === "design" ? "design" : "engineering"} case</span>
        <Rise
          as="span"
          lines={[
            <span key="t" className="inline-flex items-baseline gap-[0.25em]">
              {next.title}
            </span>,
          ]}
          className="t-display mt-4 block"
        />
      </Link>
    </section>
  );
}

export function CaseStudyView({ study, next }: { study: CaseStudy; next: CaseStudy }) {
  return (
    <article data-theme="ink">
      <Header study={study} />
      <Cover study={study} />
      <Brief study={study} />
      <Approach study={study} />
      <Inside study={study} />
      <Facts study={study} />
      <Next next={next} />
      <MoreWork current={study.slug} />
    </article>
  );
}
