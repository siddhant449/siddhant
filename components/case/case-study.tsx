"use client";

import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/lib/content";
import { useIntro } from "@/lib/intro";
import { ProjectFrame } from "../work";
import { Fade, Lines, Words } from "../ui/reveal";
import { Magnetic, Roll, ScrollRead } from "../ui/text-effects";

const ARROW = (
  <svg aria-hidden viewBox="0 0 12 12" className="h-2.5 w-2.5 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
    <path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/** Big titles never break inside a hyphenated word ("e-commerce"). */
function unbroken(text: string) {
  return text.split(" ").map((word, i, all) => (
    <span key={i}>
      <span className="whitespace-nowrap">{word}</span>
      {i < all.length - 1 ? " " : null}
    </span>
  ));
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <Lines
      as="h2"
      id={id}
      lines={[children]}
      className="text-[clamp(36px,4.6vw,76px)] font-extrabold leading-[0.92] tracking-[-0.02em] wdth-62"
    />
  );
}

/* ------------------------------------------------------------------ */

function Header({ study }: { study: CaseStudy }) {
  const { done } = useIntro();
  return (
    <header className="relative z-10 bg-ink px-gutter pb-[clamp(48px,6vw,96px)] pt-[clamp(120px,18vh,184px)]">
      <Fade when={done} delay={0.1} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px]">
        <Link href="/#work" className="group inline-flex border-b border-line-strong pb-0.5 text-ash hover:text-chalk">
          <Roll>All work</Roll>
        </Link>
        <span className="text-ash">{study.kind}</span>
      </Fade>
      <Lines
        as="h1"
        when={done}
        delay={0.15}
        lines={[unbroken(study.title)]}
        className="mt-6 text-[clamp(52px,10vw,184px)] font-extrabold leading-[0.86] tracking-[-0.025em] wdth-62"
      />
      <div className="mt-[clamp(28px,4vw,56px)] grid gap-x-6 gap-y-10 md:grid-cols-12">
        <Words
          as="p"
          when={done}
          delay={0.45}
          text={study.hook}
          className="max-w-[30ch] text-[clamp(22px,2.2vw,34px)] font-light leading-[1.25] tracking-[-0.01em] wdth-112 md:col-span-7"
        />
        <Fade when={done} delay={0.6} className="md:col-span-4 md:col-start-9">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-[14px]">
            <div>
              <dt className="text-ash">Role</dt>
              <dd className="mt-1">{study.role}</dd>
            </div>
            <div>
              <dt className="text-ash">Type</dt>
              <dd className="mt-1">{study.kind}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ash">Built with</dt>
              <dd className="mt-1">{study.stack.join(", ")}</dd>
            </div>
          </dl>
          {study.live ? (
            <Magnetic className="mt-8">
              <a
                href={study.live.url}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2.5 rounded-full bg-chalk px-6 py-3.5 text-[15px] font-semibold leading-none text-ink"
              >
                <Roll>Visit live site</Roll>
                {ARROW}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Magnetic>
          ) : null}
        </Fade>
      </div>
    </header>
  );
}

/** Live projects: the home page's frame. NDA work: the numbers, since there is nothing to show. */
function Cover({ study }: { study: CaseStudy }) {
  if (study.live) {
    return (
      <section aria-label="Cover" className="group/card relative z-10 bg-ink px-gutter">
        <a href={study.live.url} target="_blank" rel="noreferrer" data-cursor-label="Visit live site" className="block rounded-[clamp(12px,1.4vw,22px)]">
          <span className="sr-only">Open the live site in a new tab</span>
          <ProjectFrame project={study.live} />
        </a>
      </section>
    );
  }
  return (
    <section aria-label="In numbers" className="relative z-10 bg-ink px-gutter">
      <div className="grid gap-x-6 gap-y-10 rounded-[clamp(12px,1.4vw,22px)] border border-line px-[clamp(20px,3vw,48px)] py-[clamp(32px,5vw,72px)] md:grid-cols-12">
        <Fade as="p" className="max-w-[30ch] text-[15px] leading-[1.55] text-ash md:col-span-3">
          Client and product names stay private. Everything below is what I built.
        </Fade>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 md:col-span-9 lg:grid-cols-4">
          {study.facts.map((f, i) => (
            <Fade key={f.label} delay={i * 0.06} className="border-l border-line pl-4">
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="block text-[clamp(40px,4.6vw,76px)] font-bold leading-none tracking-[-0.02em] wdth-75">{f.value}</span>
                <span className="mt-3 block max-w-[20ch] text-[14px] leading-snug text-ash">{f.label}</span>
              </dd>
            </Fade>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Brief({ study }: { study: CaseStudy }) {
  return (
    <section aria-labelledby="brief-title" className="relative z-10 bg-ink px-gutter pt-[clamp(96px,12vw,200px)]">
      <div className="grid gap-x-6 gap-y-8 md:grid-cols-12">
        <div className="md:col-span-3">
          <SectionTitle id="brief-title">The brief</SectionTitle>
        </div>
        <ScrollRead
          text={study.brief}
          className="max-w-[34ch] text-[clamp(24px,2.8vw,44px)] font-medium leading-[1.14] tracking-[-0.02em] md:col-span-8 md:col-start-5"
        />
      </div>
    </section>
  );
}

function Approach({ study }: { study: CaseStudy }) {
  return (
    <section aria-labelledby="approach-title" className="relative z-10 bg-ink px-gutter pt-[clamp(96px,12vw,200px)]">
      <div className="grid gap-x-6 gap-y-10 md:grid-cols-12">
        <div className="md:col-span-3">
          <div className="md:sticky md:top-[max(96px,12vh)]">
            <SectionTitle id="approach-title">What I did</SectionTitle>
          </div>
        </div>
        <ol className="relative md:col-span-8 md:col-start-5">
          <span aria-hidden className="absolute bottom-3 left-0 top-3 w-px bg-line" />
          {study.approach.map((step, i) => (
            <Fade as="li" key={step.title} className="relative pb-[clamp(36px,5vw,64px)] pl-9 last:pb-0 md:pl-14">
              <span aria-hidden className="absolute left-0 top-[7px] h-[11px] w-[11px] -translate-x-1/2 rounded-full border border-chalk bg-ink" />
              <p className="text-[14px] tabular-nums text-ash">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-[clamp(26px,2.6vw,40px)] font-bold leading-[1.02] tracking-[-0.015em] wdth-75">{step.title}</h3>
              <p className="mt-3 max-w-[56ch] text-[clamp(16px,1.2vw,19px)] leading-[1.6] text-chalk/80">{step.body}</p>
            </Fade>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Inside({ study }: { study: CaseStudy }) {
  const withImages = study.inside.some((b) => b.image);
  return (
    <section aria-labelledby="inside-title" className="relative z-10 bg-ink px-gutter pt-[clamp(96px,12vw,200px)]">
      <SectionTitle id="inside-title">A closer look</SectionTitle>
      {withImages ? (
        <div className="mt-[clamp(40px,5vw,80px)] space-y-[clamp(64px,9vw,140px)]">
          {study.inside.map((block, i) => (
            <article key={block.title} className="group grid items-center gap-x-6 gap-y-8 md:grid-cols-12">
              {block.image ? (
                <Fade className={`md:col-span-8 ${i % 2 ? "md:order-2 md:col-start-5" : ""}`}>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[clamp(12px,1.4vw,20px)] bg-smoke/30">
                    <Image
                      src={block.image.src}
                      alt={block.image.alt}
                      fill
                      sizes="(min-width: 768px) 62vw, 100vw"
                      className="object-cover object-top transition-[filter] duration-700 md:grayscale md:group-hover:grayscale-0"
                    />
                    <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-line" />
                  </div>
                </Fade>
              ) : null}
              <Fade delay={0.1} className={`md:col-span-4 ${i % 2 ? "md:order-1 md:col-start-1" : ""}`}>
                <p className="text-[14px] tabular-nums text-ash">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-[clamp(26px,2.4vw,38px)] font-bold leading-[1.02] tracking-[-0.015em] wdth-75">{block.title}</h3>
                <p className="mt-3 max-w-[40ch] text-[clamp(16px,1.15vw,18px)] leading-[1.6] text-chalk/80">{block.body}</p>
              </Fade>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-[clamp(40px,5vw,80px)] grid gap-x-6 gap-y-12 md:grid-cols-3">
          {study.inside.map((block, i) => (
            <Fade key={block.title} delay={i * 0.06} className="border-t border-line pt-6">
              <h3 className="text-[clamp(24px,2.2vw,34px)] font-bold leading-[1.05] tracking-[-0.015em] wdth-75">{block.title}</h3>
              <p className="mt-3 max-w-[40ch] text-[clamp(16px,1.15vw,18px)] leading-[1.6] text-chalk/80">{block.body}</p>
            </Fade>
          ))}
        </div>
      )}
      <Fade className="mt-[clamp(48px,6vw,96px)]">
        <ul className="flex flex-wrap gap-2" aria-label="Built with">
          {study.stack.map((tool) => (
            <li key={tool} className="rounded-full border border-line-strong px-3.5 py-2 text-[14px] leading-none text-chalk/85">
              {tool}
            </li>
          ))}
        </ul>
      </Fade>
    </section>
  );
}

/** Live projects only: NDA work shows its numbers in the cover. */
function Facts({ study }: { study: CaseStudy }) {
  if (!study.live) return null;
  return (
    <section aria-labelledby="facts-title" className="relative z-10 bg-ink px-gutter pt-[clamp(96px,12vw,200px)]">
      <SectionTitle id="facts-title">{study.factsTitle}</SectionTitle>
      <dl className="mt-[clamp(32px,4vw,64px)] grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {study.facts.map((f, i) => (
          <Fade key={f.label} delay={i * 0.06} className="border-l border-line pl-4">
            <dt className="sr-only">{f.label}</dt>
            <dd>
              <span className="block text-[clamp(36px,4.2vw,68px)] font-bold leading-none tracking-[-0.02em] wdth-75">{f.value}</span>
              <span className="mt-3 block max-w-[22ch] text-[14px] leading-snug text-ash">{f.label}</span>
            </dd>
          </Fade>
        ))}
      </dl>
    </section>
  );
}

function Next({ next }: { next: CaseStudy }) {
  return (
    <section aria-label="Next case study" className="relative z-10 bg-ink px-gutter pb-[clamp(96px,12vw,180px)] pt-[clamp(96px,12vw,200px)]">
      <Link href={`/work/${next.slug}`} data-cursor-label="Next case" className="group block border-t border-line pt-8">
        <span className="text-[14px] text-ash">Next case, {next.kind.toLowerCase()}</span>
        <span className="mt-4 block text-[clamp(48px,9vw,168px)] font-extrabold leading-[0.88] tracking-[-0.025em] wdth-62 transition-[font-variation-settings] duration-700 ease-out-expo group-hover:wdth-100">
          {unbroken(next.title)}
        </span>
      </Link>
    </section>
  );
}

export function CaseStudyView({ study, next }: { study: CaseStudy; next: CaseStudy }) {
  return (
    <article>
      <Header study={study} />
      <Cover study={study} />
      <Brief study={study} />
      <Approach study={study} />
      <Inside study={study} />
      <Facts study={study} />
      <Next next={next} />
    </article>
  );
}
