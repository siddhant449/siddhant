"use client";

import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { liveWork, type LiveProject } from "@/lib/content";
import { Fade, Lines } from "./ui/reveal";
import { Roll } from "./ui/text-effects";

const SPREAD = { duration: 1.35, ease: [0.45, 0, 0.15, 1] as const };

/** Desktop capture from the small breakpoint up, the phone capture below it. */
function Shot({
  project,
  priority,
  decorative,
  className = "",
}: {
  project: LiveProject;
  priority?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <>
      <Image
        src={project.images.hero}
        alt={decorative ? "" : project.images.alt}
        fill
        priority={priority}
        sizes="(min-width: 768px) 94vw, 100vw"
        className={`hidden object-cover object-top sm:block ${className}`}
      />
      <Image
        src={project.images.mobile}
        alt={decorative ? "" : project.images.mobileAlt}
        fill
        sizes="100vw"
        className={`object-cover object-top sm:hidden ${className}`}
      />
    </>
  );
}

function ProjectFrame({ project, priority }: { project: LiveProject; priority?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-3.4%", "3.4%"]);
  const phoneY = useTransform(scrollYProgress, [0, 1], ["22%", "-22%"]);

  // Colour on contact: a circle of colour grows from wherever you touch.
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const radius = useMotionValue(0);
  const mask = useMotionTemplate`radial-gradient(circle at ${mx}% ${my}%, #000 ${radius}%, transparent calc(${radius}% + 14%))`;

  // Touch screens have no hover, so colour arrives when the frame is centred.
  const centred = useInView(frame, { margin: "-35% 0px -35% 0px" });
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    animate(radius, centred ? 130 : 0, SPREAD);
  }, [centred, radius]);

  function point(e: React.PointerEvent) {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  }

  return (
    <div
      ref={frame}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        point(e);
        animate(radius, 130, SPREAD);
      }}
      onPointerMove={(e) => e.pointerType === "mouse" && point(e)}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        point(e);
        animate(radius, 0, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });
      }}
      className="relative aspect-[4/5] overflow-hidden rounded-[clamp(12px,1.4vw,22px)] bg-smoke/30 sm:aspect-[16/9.3]"
    >
      {/* At rest: monochrome. */}
      <motion.div style={{ y: imageY }} className="absolute inset-x-0 top-[-2%] h-[107.5%] max-sm:-inset-y-[6%] max-sm:h-auto">
        <Shot project={project} priority={priority} className="grayscale brightness-[0.72] contrast-[1.12]" />
      </motion.div>

      {/* On contact: the same frame in colour, revealed through a growing circle. */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
      >
        <motion.div style={{ y: imageY }} className="absolute inset-x-0 top-[-2%] h-[107.5%] max-sm:-inset-y-[6%] max-sm:h-auto">
          <Shot project={project} decorative />
        </motion.div>
      </motion.div>

      {/* The phone build, floating over the desktop one. */}
      <motion.div
        style={{ y: phoneY }}
        className="absolute bottom-[6%] right-[5%] hidden aspect-[390/844] w-[18%] overflow-hidden rounded-[clamp(10px,1.5vw,26px)] border border-line-strong shadow-[0_40px_80px_-20px_rgb(0_0_0/0.75)] sm:block"
      >
        <Image
          src={project.images.mobile}
          alt={project.images.mobileAlt}
          fill
          sizes="18vw"
          className="object-cover object-top grayscale transition-[filter] duration-700 group-hover/card:grayscale-0"
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-line" />
    </div>
  );
}

function ProjectEntry({ project, index }: { project: LiveProject; index: number }) {
  return (
    <article className="group/card">
      <a
        href={project.url}
        target="_blank"
        rel="noreferrer"
        data-cursor-label="Visit live site"
        aria-label={`${project.name}: open the live site in a new tab`}
        className="block rounded-[clamp(12px,1.4vw,22px)]"
      >
        <ProjectFrame project={project} priority={index === 0} />
      </a>

      <div className="mt-7 grid gap-x-6 gap-y-6 md:mt-9 md:grid-cols-12">
        <div className="md:col-span-5">
          <Lines
            as="h3"
            lines={[project.name]}
            className="text-[clamp(44px,6.2vw,108px)] font-extrabold leading-[0.88] tracking-[-0.02em]"
            lineClassName="wdth-62 transition-[font-variation-settings] duration-700 ease-out-expo group-hover/card:wdth-100"
          />
          <Fade as="p" delay={0.1} className="mt-3 text-[15px] text-ash">
            {project.kind}
          </Fade>
        </div>
        <Fade as="p" delay={0.15} className="max-w-[46ch] text-[clamp(17px,1.25vw,20px)] leading-[1.55] text-chalk/85 md:col-span-4 md:col-start-7">
          {project.summary}
        </Fade>
        <Fade delay={0.2} className="text-[14px] md:col-span-2 md:col-start-11">
          <dl className="space-y-4">
            <div>
              <dt className="text-ash">Role</dt>
              <dd>{project.role}</dd>
            </div>
            <div>
              <dt className="text-ash">Built with</dt>
              <dd>{project.stack.join(", ")}</dd>
            </div>
          </dl>
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="group mt-5 inline-flex items-center gap-2 border-b border-line-strong pb-1 font-medium"
          >
            <Roll>{project.host}</Roll>
            <svg aria-hidden viewBox="0 0 12 12" className="h-2.5 w-2.5 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              <path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Fade>
      </div>
    </article>
  );
}

export function Work() {
  return (
    <section id="work" data-nav="work" aria-labelledby="work-title" className="relative z-10 bg-ink px-gutter pb-[clamp(96px,12vw,200px)] pt-[clamp(48px,6vw,96px)]">
      <div className="mb-[clamp(48px,7vw,120px)] grid items-end gap-6 md:grid-cols-12">
        <Lines
          as="h2"
          id="work-title"
          lines={["Work you", "can click."]}
          className="text-[clamp(56px,10vw,184px)] font-extrabold leading-[0.84] tracking-[-0.025em] wdth-62 md:col-span-8"
        />
        <Fade as="p" className="max-w-[30ch] text-[clamp(17px,1.3vw,20px)] leading-[1.5] text-ash md:col-span-4 md:col-start-9 md:pb-3">
          {liveWork.note}
        </Fade>
      </div>

      <div className="space-y-[clamp(96px,12vw,200px)]">
        {liveWork.projects.map((project, i) => (
          <ProjectEntry key={project.slug} project={project} index={i} />
        ))}
      </div>
    </section>
  );
}
