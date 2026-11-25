"use client";

import { useLenis } from "lenis/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { hero, nav, site } from "@/lib/content";
import { onReady } from "./loader";
import s from "./nav.module.css";
import { LocalTime } from "./ui/local-time";

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

/** True while the page's last screen (the pinned footer) is being revealed: the footer has its own top links. */
function useAtFooter() {
  const [at, setAt] = useState(false);
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const left = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      setAt(left < window.innerHeight * 0.55);
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
  return at;
}

/** Relative luminance of a computed colour string, or null when it is transparent. */
function luminance(color: string) {
  const m = color.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  if (m.length >= 4 && Number(m[3]) < 0.5) return null;
  const [r, g, b] = m.slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Tone of the page under the chips ("ink" | "paper"). Most sections paint with the page's
 * --bg (set from html[data-theme] by ThemeWatcher) while pinned screens paint their own, so the
 * first opaque background beneath the header row is read directly; html[data-theme] is the fallback.
 */
function useToneUnder(header: React.RefObject<HTMLElement | null>) {
  const [tone, setTone] = useState<"ink" | "paper">("ink");
  useEffect(() => {
    let raf = 0;
    let settle = 0;
    const compute = () => {
      raf = 0;
      const el = header.current;
      if (!el) return;
      const y = parseFloat(getComputedStyle(el).paddingTop) + 22;
      let lum: number | null = null;
      for (const hit of document.elementsFromPoint(window.innerWidth * 0.5, y)) {
        if (el.contains(hit)) continue;
        lum = luminance(getComputedStyle(hit).backgroundColor);
        if (lum !== null) break;
      }
      const next = lum !== null ? (lum > 0.5 ? "paper" : "ink") : document.documentElement.dataset.theme === "paper" ? "paper" : "ink";
      setTone(next);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
      // The page eases between themes over 350ms; read again once it has settled.
      window.clearTimeout(settle);
      settle = window.setTimeout(() => requestAnimationFrame(compute), 420);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      mo.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [header]);
  return tone;
}

/** On the home page a plain anchor (smooth-scrolled by Lenis); elsewhere a link home. */
function SectionLink({ onHome, href, ...props }: React.ComponentProps<"a"> & { onHome: boolean; href: string }) {
  return onHome ? <a href={href} {...props} /> : <Link href={`/${href}`} {...props} />;
}

const available = hero.meta.find((m) => "dot" in m && m.dot)?.strong ?? "Available for projects";

export function Nav() {
  const onHome = usePathname() === "/";
  const active = useActiveSection(onHome);
  const atFooter = useAtFooter();
  const lenis = useLenis();
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const tone = useToneUnder(header);
  const [openState, setOpen] = useState(false);
  // The header leaves at the pinned footer; a menu left open there closes with it.
  const open = openState && !atFooter;
  const [entered, setEntered] = useState(false);

  // Chips rise out of the row once the entry curtain lifts.
  useEffect(() => onReady(() => requestAnimationFrame(() => setEntered(true))), []);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) menuButton.current?.focus();
  }, []);

  // Lenis (and native touch scroll) stop while the menu is open.
  useEffect(() => {
    if (!lenis) return;
    if (open) lenis.stop();
    else lenis.start();
  }, [open, lenis]);
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 812px)").matches) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  // Focus moves into the menu; Escape or focus leaving the header closes it.
  useEffect(() => {
    if (!open) return;
    const first = menu.current?.querySelector<HTMLElement>("a");
    const t = window.setTimeout(() => first?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onFocus = (e: FocusEvent) => {
      if (header.current && e.target instanceof Node && !header.current.contains(e.target)) close(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open, close]);

  // On the home page, menu links close the menu and hand the anchor to Lenis once it runs again.
  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    if (!onHome || !lenis) return;
    e.preventDefault();
    lenis.start();
    lenis.scrollTo(href);
    history.replaceState(null, "", href);
  };

  const hidden = atFooter && !open;
  const cls = [s.header, entered ? s.in : "", open ? s.open : "", hidden ? s.away : ""].join(" ");

  return (
    <header ref={header} className={cls} data-on={tone} inert={hidden}>
      <div className={s.backdrop} onClick={() => close(false)} aria-hidden="true" />
      <div className={s.row}>
        {onHome ? (
          <a href="#top" className={`${s.chip} ${s.logo}`} aria-label={`${site.name}, back to top`}>
            {site.name}
          </a>
        ) : (
          <Link href="/" className={`${s.chip} ${s.logo}`} aria-label={`${site.name}, home`}>
            {site.name}
          </Link>
        )}
        <div className={s.right}>
          <span className={`${s.chip} ${s.small} ${s.status}`} role="img" aria-label={available} title={available}>
            <i />
          </span>
          <SectionLink onHome={onHome} href="#contact" className={`${s.chip} ${s.small} ${s.talk}`}>
            <span className={s.lead} aria-hidden="true" />
            <span className={s.talkText}>Start a project</span>
            <span className={s.tail} aria-hidden="true" />
          </SectionLink>
          <button
            ref={menuButton}
            type="button"
            className={`${s.chip} ${s.small} ${s.menuBtn}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Menu"}
          >
            <span className={s.menuIn}>
              <span className={s.menuTx}>Menu</span>
              <span className={s.menuClose} aria-hidden="true">
                Close
              </span>
              <span className={s.dots} aria-hidden="true">
                <i />
                <i />
              </span>
            </span>
          </button>
        </div>
      </div>

      <nav ref={menu} id="site-menu" className={s.menu} aria-label="Sections" inert={!open}>
        <div className={`${s.card} ${s.links}`}>
          {nav.map((item) => {
            const id = item.href.slice(1);
            const on = active === id;
            return (
              <SectionLink
                key={item.href}
                onHome={onHome}
                href={item.href}
                onClick={(e) => go(e, item.href)}
                aria-current={on ? "location" : undefined}
                className={`${s.link} ${on ? s.active : ""}`}
              >
                <span className={s.linkBg} aria-hidden="true" />
                <span className={s.linkInner}>
                  <span className={s.linkT}>{item.label}</span>
                  <span className={s.linkC} aria-hidden="true">
                    {item.label}
                  </span>
                </span>
                <span className={s.mark} aria-hidden="true" />
              </SectionLink>
            );
          })}
        </div>
        <div className={`${s.card} ${s.avail}`}>
          <h3>{available}</h3>
          <p className={s.field}>
            <span>{site.location.split(",")[0]}</span>
            <b>
              <LocalTime /> IST
            </b>
          </p>
        </div>
        <SectionLink onHome={onHome} href="#contact" onClick={(e) => go(e, "#contact")} className={`${s.card} ${s.talkCard}`}>
          <span>Start a project</span>
          <i aria-hidden="true" />
        </SectionLink>
        <a href={`mailto:${site.email}`} className={`${s.card} ${s.mail}`} onClick={() => setOpen(false)}>
          <span className={s.mailRow}>
            <svg viewBox="0 0 38 38" aria-hidden="true">
              <circle cx="19" cy="19" r="17.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="19" cy="19" r="6" fill="var(--signal)" />
            </svg>
            <span className={s.mailTx}>
              <span>Email</span>
              <span aria-hidden="true">Email</span>
            </span>
            <i className={s.g1} aria-hidden="true" />
            <i className={s.g2} aria-hidden="true" />
          </span>
        </a>
      </nav>
    </header>
  );
}
