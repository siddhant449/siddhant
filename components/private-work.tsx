"use client";

import { AnimatePresence, m } from "motion/react";
import { useId, useState } from "react";
import { privateWork, type PrivateProject } from "@/lib/content";
import { Fade, Lines } from "./ui/reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

function Row({
  project,
  open,
  onToggle,
}: {
  project: PrivateProject;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  return (
    <li className="group/row border-t border-line last:border-b">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-[clamp(20px,2.4vw,36px)] text-left md:grid-cols-12"
        >
          <span
            className={`text-[clamp(30px,4.4vw,76px)] font-extrabold leading-[0.95] tracking-[-0.02em] transition-[font-variation-settings,color] duration-700 ease-out-expo md:col-span-6 ${
              open ? "text-chalk wdth-100" : "text-chalk/80 wdth-62 group-hover/row:text-chalk group-hover/row:wdth-100"
            }`}
          >
            {project.title}
          </span>
          <span className="col-span-full row-start-2 max-w-[40ch] text-[15px] leading-[1.5] text-ash md:col-span-4 md:col-start-7 md:row-start-1">
            {project.line}
          </span>
          <span className="col-start-2 row-start-1 flex items-center gap-4 justify-self-end md:col-span-2 md:col-start-11">
            <span className="hidden text-[13px] text-ash lg:inline">{project.context}</span>
            <span
              aria-hidden
              className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors duration-500 ${
                open ? "border-chalk bg-chalk text-ink" : "border-line-strong text-chalk group-hover/row:border-chalk"
              }`}
            >
              <span className="absolute h-px w-3.5 bg-current" />
              <span
                className={`absolute h-3.5 w-px bg-current transition-transform duration-500 ease-out-expo ${open ? "scale-y-0" : ""}`}
              />
            </span>
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={panelId}
            role="region"
            aria-label={project.title}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="grid gap-x-6 gap-y-10 pb-[clamp(32px,4vw,64px)] md:grid-cols-12">
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:col-span-6">
                {project.facts.map((fact) => (
                  <div key={fact.label} className="border-l border-line pl-4">
                    <dt className="sr-only">{fact.label}</dt>
                    <dd>
                      <span className="block text-[clamp(36px,3.6vw,60px)] font-bold leading-none tracking-[-0.02em] wdth-75">
                        {fact.value}
                      </span>
                      <span className="mt-2 block text-[14px] leading-snug text-ash">{fact.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="md:col-span-5 md:col-start-8">
                <p className="max-w-[52ch] text-[clamp(16px,1.15vw,18px)] leading-[1.65] text-chalk/85">{project.detail}</p>
                <ul className="mt-6 flex flex-wrap gap-2" aria-label="Built with">
                  {project.stack.map((tool) => (
                    <li key={tool} className="rounded-full border border-line px-3 py-1.5 text-[13px] leading-none text-ash">
                      {tool}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-[13px] text-ash lg:hidden">{project.context}</p>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function PrivateWork() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section data-nav="work" aria-labelledby="private-title" className="relative z-10 bg-ink px-gutter pb-[clamp(96px,12vw,200px)]">
      <div className="mb-[clamp(40px,5vw,80px)] grid items-end gap-6 md:grid-cols-12">
        <Lines
          as="h2"
          id="private-title"
          lines={["The rest runs behind", "logins and NDAs."]}
          className="text-[clamp(36px,5.2vw,92px)] font-extrabold leading-[0.92] tracking-[-0.02em] wdth-62 md:col-span-8"
        />
        <Fade as="p" className="max-w-[30ch] text-[clamp(17px,1.3vw,20px)] leading-[1.5] text-ash md:col-span-4 md:col-start-9 md:pb-2">
          {privateWork.note}
        </Fade>
      </div>
      <ul>
        {privateWork.projects.map((project, i) => (
          <Row
            key={project.title}
            project={project}
            open={open === i}
            onToggle={() => setOpen((cur) => (cur === i ? null : i))}
          />
        ))}
      </ul>
    </section>
  );
}
