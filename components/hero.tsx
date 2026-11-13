"use client";

import { m, useInView, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { hero, site } from "@/lib/content";
import { flowState, notifyFlow } from "@/lib/flow-state";
import { useIntro } from "@/lib/intro";
import { FitLine } from "./ui/fit-line";
import { Fade, Lines, Words } from "./ui/reveal";
import { Magnetic, Roll } from "./ui/text-effects";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { done } = useIntro();
  const inView = useInView(ref, { margin: "0px 0px -2% 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Scrolling away pulls the field into straight lines and squeezes the name.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    flowState.heroOrder = Math.min(1, p * 1.15);
  });
  useEffect(() => {
    flowState.heroVisible = inView;
    notifyFlow();
  }, [inView]);
  // Leaving the home page: the field no longer has a hero to show through.
  useEffect(
    () => () => {
      flowState.heroVisible = false;
      notifyFlow();
    },
    [],
  );

  const nameWidth = useTransform(scrollYProgress, [0, 0.75], [100, 62]);
  const nameVariation = useTransform(nameWidth, (w) => `"wdth" ${w.toFixed(1)}`);
  const nameY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section
      ref={ref}
      id="top"
      aria-label="Introduction"
      className="relative z-10 flex min-h-[640px] flex-col justify-between px-gutter pb-[clamp(12px,2vw,28px)] pt-[clamp(112px,17vh,176px)] h-svh"
    >
      {/* Let the field sink into the black page below. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] bg-gradient-to-b from-transparent to-ink" />
      <m.div style={{ y: copyY, opacity: copyOpacity }} className="await-font relative grid gap-y-10 md:grid-cols-12">
        <Lines
          as="p"
          when={done}
          delay={0.15}
          stagger={0.12}
          className="text-[clamp(38px,6vw,104px)] leading-[0.98] tracking-[-0.025em] md:col-span-12"
          lines={[
            <span key="surface" className="font-extralight wdth-125">
              {hero.surface}
            </span>,
            <span key="depth" className="font-extrabold wdth-62">
              {hero.depth}
            </span>,
          ]}
        />

        <div className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
          <Words
            text={hero.intro}
            when={done}
            delay={0.55}
            className="max-w-[36ch] text-[clamp(17px,1.35vw,21px)] leading-[1.5] text-ash"
          />
          <Fade when={done} delay={0.9} className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Magnetic>
              <a
                href={`mailto:${site.email}?subject=${encodeURIComponent("A project for you")}`}
                className="group inline-flex rounded-full bg-chalk px-6 py-4 text-[15px] font-semibold leading-none text-ink"
              >
                <Roll>{hero.primaryCta}</Roll>
              </a>
            </Magnetic>
            <a
              href="#work"
              className="group relative py-2 text-[15px] font-medium leading-none text-chalk"
            >
              <Roll>{hero.secondaryCta}</Roll>
              <span className="absolute inset-x-0 bottom-0 h-px origin-left bg-line-strong transition-transform duration-500 ease-out-expo group-hover:scale-x-0" />
            </a>
          </Fade>
        </div>
      </m.div>

      <m.div style={{ y: nameY }} className="relative">
        <h1 className="leading-[0.8] tracking-[-0.03em]">
          <span className="sr-only">
            {site.name}, {site.role.toLowerCase()} in {site.location}
          </span>
          {/* Fallback sizes are the measured fit as a share of the container, so nothing shifts. */}
          <span aria-hidden className="hidden [container-type:inline-size] sm:block">
            <FitLine text={site.name} fallback="13.152cqw" variation={nameVariation} show={done} delay={0.3} />
          </span>
          <span aria-hidden className="block [container-type:inline-size] sm:hidden">
            <FitLine text="Siddhant" fallback="22.375cqw" variation={nameVariation} show={done} delay={0.3} />
            <FitLine text="Kotak" measure="Siddhant" fallback="22.375cqw" variation={nameVariation} show={done} delay={0.38} />
          </span>
        </h1>
      </m.div>
    </section>
  );
}
