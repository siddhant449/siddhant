"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { nav, site } from "@/lib/content";
import { LocalTime } from "./ui/local-time";
import { EASE_INOUT, EASE_OUT } from "./ui/reveal";

/** The nav entry whose section crosses the middle of the viewport, if any. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let found: string | null = null;
      for (const el of document.querySelectorAll<HTMLElement>("[data-nav]")) {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) found = el.dataset.nav ?? null;
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
  }, [enabled]);
  return enabled ? active : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** On the home page a plain anchor (smooth-scrolled by Lenis); elsewhere a link home. */
function SectionLink({ onHome, href, ...props }: React.ComponentProps<"a"> & { onHome: boolean; href: string }) {
  return onHome ? <a href={href} {...props} /> : <Link href={`/${href}`} {...props} />;
}

export function Nav() {
  const onHome = usePathname() === "/";
  const active = useActiveSection(onHome);
  const lenis = useLenis();
  const list = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Slide the indicator to the active link (measured, no layout animation).
  useEffect(() => {
    const measure = () => {
      const el = active ? list.current?.querySelector<HTMLElement>(`[data-section="${active}"]`) : null;
      setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

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
      <header className="intro-up fixed inset-x-0 top-0 z-50 flex h-[76px] items-center justify-between px-gutter" style={{ "--d": "0.1s" } as React.CSSProperties}>
        {onHome ? (
          <a href="#top" className="relative z-10 text-[15px] font-medium tracking-[-0.02em]" aria-label={`${site.name}, back to top`}>
            {site.name}
          </a>
        ) : (
          <Link href="/" className="relative z-10 text-[15px] font-medium tracking-[-0.02em]" aria-label={`${site.name}, home`}>
            {site.name}
          </Link>
        )}

        <nav
          aria-label="Sections"
          className="absolute left-1/2 top-1/2 hidden h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fg/12 bg-bg/60 p-[3px] backdrop-blur-xl md:block"
        >
          <div ref={list} className="relative flex h-full items-center">
            <m.span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-full bg-fg"
              initial={false}
              animate={pill ? { x: pill.x, width: pill.w, opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.42, ease: EASE_OUT }}
            />
            {nav.map((item) => {
              const id = item.href.slice(1);
              const on = active === id;
              return (
                <SectionLink
                  key={item.href}
                  onHome={onHome}
                  href={item.href}
                  data-section={id}
                  aria-current={on ? "location" : undefined}
                  className={`relative flex h-full items-center rounded-full px-[15px] text-[14px] font-medium transition-colors duration-300 ${
                    on ? "text-bg" : "text-fg/62 hover:text-fg"
                  }`}
                >
                  {item.label}
                  {"count" in item ? (
                    <sup className="ml-0.5 font-mono text-[9px] font-medium tracking-normal">{pad(item.count)}</sup>
                  ) : null}
                </SectionLink>
              );
            })}
          </div>
        </nav>

        <div className="relative z-10 flex items-center gap-5">
          <p className="t-label mute hidden lg:block">
            <LocalTime className="text-fg" /> IST
          </p>
          <SectionLink onHome={onHome} href="#contact" className="btn btn-solid hidden md:inline-flex">
            Start a project
          </SectionLink>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="btn btn-line bg-bg/60 backdrop-blur-xl md:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </header>

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
            transition={{ duration: 0.7, ease: EASE_INOUT }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-ink px-gutter pb-8 pt-28 text-paper md:hidden"
          >
            <ul>
              {[...nav, { label: "Contact", href: "#contact" } as const].map((item, i) => (
                <li key={item.href} className="overflow-hidden border-b border-paper/12">
                  <m.span
                    className="block"
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 + i * 0.05 }}
                  >
                    <SectionLink
                      onHome={onHome}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline justify-between py-3"
                      autoFocus={i === 0}
                    >
                      <span className="t-h1">{item.label}</span>
                      {"count" in item ? <span className="t-label mute">{pad(item.count)}</span> : null}
                    </SectionLink>
                  </m.span>
                </li>
              ))}
            </ul>
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="space-y-3 t-small">
              <a href={`mailto:${site.email}`} className="block break-all">
                {site.email}
              </a>
              <p className="t-label mute">
                {site.location} · <LocalTime /> IST
              </p>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
