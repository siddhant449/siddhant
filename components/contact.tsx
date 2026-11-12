"use client";

import { useLenis } from "lenis/react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { contact, site } from "@/lib/content";
import { flowState, notifyFlow } from "@/lib/flow-state";
import { LocalTime } from "./ui/local-time";
import { Fade, Lines } from "./ui/reveal";
import { Magnetic, Roll, useScramble } from "./ui/text-effects";

function EmailLink() {
  const { output, run } = useScramble(site.email, 700);
  return (
    <a
      href={`mailto:${site.email}`}
      onPointerEnter={run}
      onFocus={run}
      data-cursor-label="Write to me"
      className="group relative inline-block max-w-full break-all text-[clamp(26px,5.2vw,92px)] font-semibold leading-[1.02] tracking-[-0.02em] wdth-75"
    >
      <span className="sr-only">{site.email}</span>
      <span aria-hidden>{output}</span>
      <span className="absolute inset-x-0 -bottom-1 h-[2px] origin-right scale-x-0 bg-chalk transition-transform duration-700 ease-out-expo group-hover:origin-left group-hover:scale-x-100" />
    </a>
  );
}

/** The current year, filled in on the client so the page can be prerendered. */
function Year() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setYear(new Date().getFullYear()));
    return () => cancelAnimationFrame(id);
  }, []);
  return <span suppressHydrationWarning>{year ?? 2026}</span>;
}

function CopyButton() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(site.email);
          setCopied(true);
        } catch {
          window.location.href = `mailto:${site.email}`;
        }
      }}
      className="group inline-flex rounded-full border border-line-strong bg-ink/40 px-5 py-3.5 text-[14px] font-semibold leading-none backdrop-blur-md transition-colors duration-500 hover:border-chalk"
    >
      <Roll>{copied ? contact.copied : contact.copy}</Roll>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email address copied to clipboard" : ""}
      </span>
    </button>
  );
}

export function Contact() {
  const ref = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const inView = useInView(ref, { margin: "0px 0px 0px 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const lift = useTransform(scrollYProgress, [0, 1], [120, 0]);

  useEffect(() => {
    flowState.footerVisible = inView;
    notifyFlow();
  }, [inView]);

  return (
    <footer
      ref={ref}
      id="contact"
      aria-labelledby="contact-title"
      className="relative z-10 flex min-h-svh flex-col justify-between px-gutter pb-6 pt-[clamp(140px,18vh,220px)]"
    >
      {/* Ease the black page into the field behind the footer. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[38vh] bg-gradient-to-b from-ink to-transparent" />

      <motion.div style={{ y: lift }} className="relative">
        <Lines
          as="h2"
          id="contact-title"
          lines={["Got something", "worth building?"]}
          className="text-[clamp(52px,10.4vw,196px)] font-extrabold leading-[0.84] tracking-[-0.03em] wdth-62"
        />
        <div className="mt-[clamp(32px,4vw,64px)] grid gap-x-6 gap-y-8 md:grid-cols-12">
          <Fade as="p" className="max-w-[34ch] text-[clamp(17px,1.35vw,21px)] leading-[1.5] text-ash md:col-span-4">
            {contact.body}
          </Fade>
          <Fade delay={0.1} className="flex flex-col items-start gap-6 md:col-span-8">
            <EmailLink />
            <div className="flex flex-wrap items-center gap-3">
              <Magnetic>
                <a
                  href={`mailto:${site.email}?subject=${encodeURIComponent("A project for you")}`}
                  className="group inline-flex rounded-full bg-chalk px-6 py-3.5 text-[14px] font-semibold leading-none text-ink"
                >
                  <Roll>Start a project</Roll>
                </a>
              </Magnetic>
              <CopyButton />
            </div>
          </Fade>
        </div>
      </motion.div>

      <div className="relative mt-24 grid gap-x-6 gap-y-10 border-t border-line pt-8 text-[14px] sm:grid-cols-2 md:grid-cols-12">
        <div className="md:col-span-3">
          <p className="text-ash">Elsewhere</p>
          <ul className="mt-3 space-y-1.5">
            <li>
              <a href={site.links.linkedin} target="_blank" rel="noreferrer" className="group inline-flex">
                <Roll>LinkedIn</Roll>
              </a>
            </li>
            <li>
              <a href={site.links.github} target="_blank" rel="noreferrer" className="group inline-flex">
                <Roll>GitHub</Roll>
              </a>
            </li>
            <li>
              <a href={site.links.resume} target="_blank" rel="noreferrer" className="group inline-flex">
                <Roll>Résumé (PDF)</Roll>
              </a>
            </li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="text-ash">Local time</p>
          <p className="mt-3">
            Ahmedabad, <LocalTime /> IST
          </p>
        </div>
        <div className="flex flex-col justify-between gap-6 sm:col-span-2 md:col-span-6 md:items-end md:text-right">
          <button
            type="button"
            onClick={() => (lenis ? lenis.scrollTo(0, { duration: 2.2 }) : window.scrollTo({ top: 0 }))}
            className="group inline-flex self-start rounded-full border border-line-strong px-5 py-3 font-semibold leading-none md:self-end"
          >
            <Roll>{contact.backToTop}</Roll>
          </button>
          <p className="text-ash">
            © <Year /> {site.name}. {contact.signature}
          </p>
        </div>
      </div>
    </footer>
  );
}
