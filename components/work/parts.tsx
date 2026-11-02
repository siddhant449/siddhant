"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore, type FocusEventHandler, type MouseEvent, type ReactNode } from "react";
import type { MotionStyle, MotionValue } from "motion/react";
import type { CaseStudy, Frame } from "@/lib/content";
import styles from "./parts.module.css";

/** CSS custom properties driven by motion values (MotionStyle doesn't type them). */
export const vars = (v: Record<`--${string}`, MotionValue<number> | number>) => v as MotionStyle;

/** The screen pushes in this long before the case study opens. */
export const PUSH_MS = 250;

/** The screenshots are 2880×1800 masters; the screen is about 62vw wide on desktop. */
export const SCREEN_SIZES = "(min-width: 1024px) 62vw, 92vw";

/** A media query as a store: false on the server, so hydration matches, then the real value. */
export function useMedia(query: string) {
  const subscribe = useCallback(
    (fn: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", fn);
      return () => m.removeEventListener("change", fn);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/**
 * The deliberate way into a case study: a pointer click pushes the screen in (PUSH_MS), then
 * navigates, so the browser morphs the screen into the case-study hero. Keyboard activation and
 * modified clicks just navigate. The home page stays alive behind the case study (Activity), so
 * the push is put back when it hides, and Back finds a clean screen.
 */
export function useOpen(slug: string, push = true) {
  const router = useRouter();
  const href = `/work/${slug}`;
  const [pushing, setPushing] = useState(false);
  const timer = useRef(0);

  useLayoutEffect(
    () => () => {
      window.clearTimeout(timer.current);
      setPushing(false);
    },
    [],
  );

  const onClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
      // detail is 0 for keyboard activation.
      if (!push || modified || e.detail === 0) return;
      e.preventDefault();
      if (timer.current) return;
      setPushing(true);
      router.prefetch(href);
      timer.current = window.setTimeout(() => {
        timer.current = 0;
        router.push(href);
      }, PUSH_MS);
    },
    [href, push, router],
  );

  return { href, pushing, onClick };
}

/** "Design, motion and build" → ["Design", "Motion", "Build"]. */
export const roles = (role: string) =>
  role
    .split(/,\s*|\s+and\s+/)
    .filter(Boolean)
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1));

/** The project's title block: title, logline, then client and role (as pills). */
export function ProjectCopy({ study, headingId, className }: { study: CaseStudy; headingId: string; className?: string }) {
  return (
    <div className={`${styles.copy} ${className ?? ""}`}>
      <h3 id={headingId} className={styles.title}>
        {study.title}
      </h3>
      <p className={styles.logline}>{study.logline}</p>
      <dl className={styles.meta}>
        <div>
          <dt>Client</dt>
          <dd>{study.client}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>
            <ul className={styles.pills}>
              {roles(study.role).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </div>
  );
}

type CtaProps = {
  study: CaseStudy;
  onOpen?: (e: MouseEvent<HTMLAnchorElement>) => void;
  onFocus?: FocusEventHandler<HTMLDivElement>;
  /** Phones: full width and stacked, 52px tall. */
  stacked?: boolean;
  className?: string;
};

/** The two ways out, and the most obvious controls on screen: read the case study, or visit the site. */
export function Ctas({ study, onOpen, onFocus, stacked, className }: CtaProps) {
  return (
    <div className={`${styles.ctas} ${stacked ? styles.ctasStacked : ""} ${className ?? ""}`} onFocus={onFocus}>
      <Link href={`/work/${study.slug}`} className={styles.primary} onClick={onOpen}>
        Read the case study<span className="sr-only">: {study.title}</span>
        <span className={styles.arrow} aria-hidden>
          →
        </span>
      </Link>
      <a href={study.url} target="_blank" rel="noreferrer" className={styles.secondary}>
        Visit {study.host}
        <span aria-hidden>↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

/** A browser's toolbar: three dots and the site's address. */
export function Toolbar({ host }: { host: string }) {
  return (
    <div className={styles.bar} aria-hidden>
      <span className={styles.dots}>
        <i />
        <i />
        <i />
      </span>
      <span className={styles.url}>
        <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden>
          <path d="M2 4.2V3a2 2 0 1 1 4 0v1.2M1 4.2h6v5H1z" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </svg>
        {host}
      </span>
    </div>
  );
}

/** A front-on browser window: the toolbar over the picture. */
export function Chrome({ host, children, className }: { host: string; children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.chrome} ${className ?? ""}`}>
      <Toolbar host={host} />
      <div className={styles.picture}>{children}</div>
    </div>
  );
}

/** A phone: rounded bezel, the mobile screenshot inside. */
export function Phone({ frame, sizes, className }: { frame: Frame; sizes: string; className?: string }) {
  return (
    <figure className={`${styles.phone} ${className ?? ""}`}>
      <span className={styles.phoneScreen}>
        <Image src={frame.src} alt={frame.alt} fill sizes={sizes} quality={85} className={styles.phoneImg} />
      </span>
      <figcaption className={styles.phoneCaption}>
        <span>{frame.n}</span> {frame.caption}
      </figcaption>
    </figure>
  );
}

export const HINT = "Scroll to browse, or click the screen to open the case study";

/** "02 / 06": a chapter's place in the reel, in tabular figures. */
export function Count({ n, of = 6 }: { n: number; of?: number }) {
  return (
    <span className={styles.count}>
      {String(n).padStart(2, "0")}
      <span> / {String(of).padStart(2, "0")}</span>
    </span>
  );
}
