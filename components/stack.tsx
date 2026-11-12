"use client";

import { useLenis } from "lenis/react";
import { m, useInView, useMotionTemplate, useScroll, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { stack, type StackLayer } from "@/lib/content";
import { StackContext } from "@/lib/stack-context";
import { Fade, Lines } from "./ui/reveal";

const LAYERS: readonly StackLayer[] = stack.layers;
const N = LAYERS.length;

/* ------------------------------------------------------------------ */
/* One layer in the scrolling list.                                     */
/* ------------------------------------------------------------------ */

function Layer({
  layer,
  index,
  onActive,
}: {
  layer: StackLayer;
  index: number;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-46% 0px -46% 0px" });
  const seen = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  let chip = 0;
  return (
    <li ref={ref} id={`stack-layer-${index}`} className="relative py-[clamp(40px,10vh,112px)] pl-9 md:pl-14">
      <span
        aria-hidden
        className={`absolute left-0 top-[clamp(40px,10vh,112px)] mt-[5px] h-[13px] w-[13px] -translate-x-1/2 rounded-full border transition-colors duration-500 ${
          inView ? "border-chalk bg-chalk" : "border-line-strong bg-ink"
        }`}
      />
      <p className="text-[14px] tabular-nums text-ash">
        {String(index + 1).padStart(2, "0")}
        <span className="sr-only"> of {N}</span>
      </p>
      <h3 className="mt-2 text-[clamp(36px,3.8vw,64px)] font-bold leading-[0.95] tracking-[-0.02em] wdth-75">{layer.name}</h3>
      <p className="mt-4 max-w-[38ch] text-[clamp(18px,1.4vw,22px)] leading-[1.45] text-chalk/90">{layer.promise}</p>
      <p className="mt-3 max-w-[44ch] text-[15px] leading-[1.55] text-ash md:hidden">{layer.proof}</p>

      <dl className="mt-8 space-y-5">
        {layer.groups.map((group) => (
          <div key={group.label} className="grid gap-2.5 sm:grid-cols-[124px_1fr] sm:gap-5">
            <dt className="text-[13px] leading-[30px] text-ash">{group.label}</dt>
            <dd>
              <ul className="flex flex-wrap gap-1.5">
                {group.tools.map((tool) => {
                  const delay = chip++ * 28;
                  return (
                    <li
                      key={tool}
                      style={{ transitionDelay: seen ? `${delay}ms` : "0ms" }}
                      className={`rounded-full border px-3 py-[7px] text-[13.5px] leading-none transition-[color,border-color,opacity,translate] duration-700 ease-out-expo ${
                        seen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                      } ${inView ? "border-chalk/50 text-chalk" : "border-line text-chalk/70"}`}
                    >
                      {tool}
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

/* ------------------------------------------------------------------ */

export function Stack({ figure }: { figure: ReactNode }) {
  const [active, setActive] = useState(0);
  const lenis = useLenis();
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);

  const pick = useCallback(
    (i: number) => {
      const el = document.getElementById(`stack-layer-${i}`);
      if (!el) return;
      if (lenis) lenis.scrollTo(el, { offset: -window.innerHeight * 0.3, duration: 1.4 });
      else el.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [lenis],
  );
  const context = useMemo(() => ({ active, pick }), [active, pick]);

  // Progress down the list drives the rail.
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 0.5", "end 0.5"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const packetTop = useMotionTemplate`${useTransform(progress, [0, 1], [0, 100])}%`;


  return (
    <StackContext.Provider value={context}>
    <section
      ref={section}
      id="stack"
      data-nav="stack"
      aria-labelledby="stack-title"
      className="relative z-10 bg-ink px-gutter pb-[clamp(96px,12vw,200px)] pt-[clamp(80px,10vw,160px)]"
    >
      <div className="grid items-end gap-6 md:grid-cols-12">
        <Lines
          as="h2"
          id="stack-title"
          lines={[...stack.title]}
          className="text-[clamp(52px,8.4vw,156px)] font-extrabold leading-[0.86] tracking-[-0.025em] wdth-62 md:col-span-7"
        />
        <Fade as="p" className="max-w-[34ch] text-[clamp(17px,1.3vw,20px)] leading-[1.5] text-ash md:col-span-4 md:col-start-9 md:pb-3">
          {stack.intro}
        </Fade>
      </div>

      <div className="mt-[clamp(32px,5vw,80px)] grid gap-x-6 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="md:sticky md:top-[max(84px,9vh)]">
            {figure}
          </div>
        </div>

        <div className="relative mt-14 md:col-span-6 md:col-start-7 md:mt-0 lg:col-span-6">
          {/* The rail, and on small screens the packet travelling down it. */}
          <div aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-line">
            <m.div style={{ scaleY: progress }} className="absolute inset-0 origin-top bg-chalk/70" />
            <m.div style={{ top: packetTop }} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
              <span className="block h-2.5 w-2.5 rounded-full bg-chalk shadow-[0_0_0_6px_rgb(236_236_231/0.12),0_0_24px_4px_rgb(236_236_231/0.45)]" />
            </m.div>
          </div>
          <ol ref={list}>
            {LAYERS.map((layer, i) => (
              <Layer key={layer.name} layer={layer} index={i} onActive={setActive} />
            ))}
          </ol>
        </div>
      </div>
    </section>
    </StackContext.Provider>
  );
}
