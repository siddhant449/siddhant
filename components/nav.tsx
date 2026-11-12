"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { nav, site } from "@/lib/content";
import { useIntro } from "@/lib/intro";
import { LocalTime } from "./ui/local-time";
import { Roll } from "./ui/text-effects";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The nav entry whose section crosses the middle of the viewport, if any. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let found: string | null = null;
      for (const el of document.querySelectorAll<HTMLElement>("[data-nav]")) {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) {
          found = el.dataset.nav ?? null;
          break;
        }
      }
      setActive(found);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return active;
}

export function Nav() {
  const { done } = useIntro();
  const lenis = useLenis();
  const active = useActiveSection();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const { scrollY } = useScroll();

  // Measure the active link so the pill can slide to it.
  useEffect(() => {
    const measure = () => {
      const link = active ? list.current?.querySelector<HTMLElement>(`[data-section="${active}"]`) : null;
      setPill(link ? { left: link.offsetLeft, width: link.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  // Step aside while reading down the page; come back on the first scroll up.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y < 120) setHidden(false);
    else if (y > prev + 4) setHidden(true);
    else if (y < prev - 4) setHidden(false);
  });

  useEffect(() => {
    if (!lenis) return;
    if (open) lenis.stop();
    else lenis.start();
  }, [open, lenis]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <m.header
        initial={{ y: -24, opacity: 0 }}
        animate={done ? { y: hidden && !open ? -110 : 0, opacity: 1 } : { y: -24, opacity: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: done && !hidden ? 0.35 : 0 }}
        className="fixed inset-x-0 top-0 z-50 px-gutter pt-4 md:pt-5"
      >
        <div className="flex items-center justify-between gap-4">
          <a
            href="#top"
            className="group relative z-10 text-[15px] font-semibold leading-none wdth-75"
            aria-label={`${site.name}, back to top`}
          >
            <Roll>{site.name}</Roll>
          </a>

          <nav
            aria-label="Sections"
            className="absolute left-1/2 hidden -translate-x-1/2 rounded-full border border-line bg-ink/60 p-1.5 backdrop-blur-xl md:block"
          >
            <ul ref={list} className="relative flex items-center">
              {/* One pill that slides to the active link (measured, so no layout animation is needed). */}
              <m.li
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-chalk"
                initial={false}
                animate={pill ? { x: pill.left, width: pill.width, opacity: 1 } : { opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              />
              {nav.map((item) => {
                const isActive = active === item.href.slice(1);
                return (
                  <li key={item.href} className="relative">
                    <a
                      href={item.href}
                      data-section={item.href.slice(1)}
                      aria-current={isActive ? "location" : undefined}
                      className={`group relative block rounded-full px-4 py-2 text-[14px] font-medium leading-none transition-colors duration-300 ${
                        isActive ? "text-ink" : "text-ash hover:text-chalk"
                      }`}
                    >
                      <Roll>{item.label}</Roll>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="relative z-10 flex items-center gap-5">
            <p className="hidden text-[13px] leading-none text-ash lg:block">
              Ahmedabad <LocalTime className="text-chalk" />
            </p>
            <a
              href={`mailto:${site.email}`}
              className="group hidden rounded-full bg-chalk px-5 py-3 text-[14px] font-semibold leading-none text-ink md:inline-flex"
            >
              <Roll>Let’s talk</Roll>
            </a>
            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="group rounded-full border border-line-strong bg-ink/60 px-5 py-3 text-[14px] font-semibold leading-none backdrop-blur-xl md:hidden"
            >
              <Roll>{open ? "Close" : "Menu"}</Roll>
            </button>
          </div>
        </div>
      </m.header>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-ink px-gutter pb-8 pt-28 md:hidden"
          >
            <nav aria-label="Sections">
              <ul>
                {nav.map((item, i) => (
                  <li key={item.href} className="overflow-hidden border-b border-line">
                    <m.a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      initial={{ y: "100%" }}
                      animate={{ y: "0%" }}
                      transition={{ duration: 0.8, ease: EASE, delay: 0.25 + i * 0.06 }}
                      className="block py-3 text-[clamp(44px,15vw,88px)] font-extrabold leading-[0.95] tracking-[-0.02em] wdth-62"
                      autoFocus={i === 0}
                    >
                      {item.label}
                    </m.a>
                  </li>
                ))}
              </ul>
            </nav>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="space-y-4 text-[15px]"
            >
              <a href={`mailto:${site.email}`} className="block break-all text-chalk underline decoration-line-strong underline-offset-4">
                {site.email}
              </a>
              <div className="flex gap-6 text-ash">
                <a href={site.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
                <a href={site.links.github} target="_blank" rel="noreferrer">GitHub</a>
                <a href={site.links.resume} target="_blank" rel="noreferrer">Résumé</a>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
