"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { design } from "@/lib/content";
import { stackedPages, type StackedSlug } from "@/lib/kit/credits";
import { bezier, hasFinePointer, IMAGE_REVEAL, prefersReducedMotion, tween } from "@/lib/kit/motion";
import styles from "./kit.module.css";

type Shot = { src: string; width: number; height: number; alt: string };

/** Pixels of page per second when the browser frame reads itself on hover. */
const READ_SPEED = 420;
const readEase = bezier([0.45, 0, 0.55, 1]);
const backEase = bezier(IMAGE_REVEAL.ease);

/**
 * A browser window and a phone, built in CSS, showing Siddhant's real pages.
 * Hover the browser and the whole page scrolls past at a reading pace, then eases back.
 * On touch screens the page position follows the frame's progress through the viewport.
 *
 * Pass `project` (a design project slug) to use its stacked page, host, sector and phone
 * screen; or pass `images` (stacked top to bottom), `url` and optionally `label` and `phone`.
 */
export function DeviceFrames({
  project,
  images,
  url,
  label,
  phone,
  className,
}: {
  project?: string;
  images?: Shot[];
  url?: string;
  label?: string;
  /** false hides the phone */
  phone?: Shot | false;
  className?: string;
}) {
  const p = project ? design.projects.find((x) => x.slug === project) : undefined;
  const stacked = p && p.slug in stackedPages ? stackedPages[p.slug as StackedSlug] : undefined;
  const pages: Shot[] =
    images ?? (stacked && p ? [{ ...stacked, alt: `${p.name} website, the full page` }] : []);
  const host = url ?? p?.host ?? "";
  const sector = label ?? p?.sector;
  const phoneShot: Shot | undefined =
    phone === false
      ? undefined
      : (phone ?? (p ? { src: p.images.mobile, width: 780, height: 1688, alt: p.images.mobileAlt } : undefined));

  const frame = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = frame.current, v = view.current, pg = page.current;
    if (!f || !v || !pg) return;
    let y = 0;
    let stop: (() => void) | undefined;
    const reduced = prefersReducedMotion();
    const max = () => Math.max(0, pg.offsetHeight - v.offsetHeight);
    const set = (n: number) => {
      y = n;
      pg.style.transform = `translate3d(0, ${-n.toFixed(1)}px, 0)`;
    };
    set(0);

    if (hasFinePointer()) {
      if (reduced) return;
      const enter = () => {
        stop?.();
        const from = y, to = max();
        const dur = Math.max(1200, ((to - from) / READ_SPEED) * 1000);
        stop = tween(dur, readEase, (k) => set(from + (to - from) * k));
      };
      const leave = () => {
        stop?.();
        const from = y;
        stop = tween(1200, backEase, (k) => set(from * (1 - k)));
      };
      f.addEventListener("pointerenter", enter);
      f.addEventListener("pointerleave", leave);
      return () => {
        stop?.();
        f.removeEventListener("pointerenter", enter);
        f.removeEventListener("pointerleave", leave);
      };
    }

    /* touch: scroll-linked, paused when off screen */
    let on = false;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = f.getBoundingClientRect();
      const prog = (innerHeight - r.top) / (innerHeight + r.height);
      set(max() * Math.min(1, Math.max(0, (prog - 0.15) / 0.7)));
    };
    const onScroll = () => {
      if (on && !raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on) onScroll();
    });
    io.observe(f);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [project, images]);

  return (
    <div className={`${styles.devices} ${className ?? ""}`} data-solo={phoneShot ? undefined : ""}>
      <div ref={frame} className={styles.browser}>
        <div className={styles.bar}>
          <span className={styles.live} aria-hidden />
          <span className={styles.url}>{host}</span>
          {sector ? <span className={styles.sector}>{sector}</span> : null}
        </div>
        <div ref={view} className={styles.viewport}>
          <div ref={page} className={styles.page}>
            {pages.map((s) => (
              <Image key={s.src} src={s.src} width={s.width} height={s.height} alt={s.alt} sizes="(max-width: 520px) 92vw, 62vw" />
            ))}
          </div>
        </div>
      </div>
      {phoneShot ? (
        <div className={styles.phone}>
          <div className={styles.screen}>
            <span className={styles.island} aria-hidden />
            <Image src={phoneShot.src} alt={phoneShot.alt} fill sizes="(max-width: 520px) 46vw, 18vw" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
