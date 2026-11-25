"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { caseStudyOf, design } from "@/lib/content";
import { bezier, cssEase, hasFinePointer, HOVER_PREVIEW, prefersReducedMotion, tween } from "@/lib/kit/motion";
import styles from "./kit.module.css";

const followEase = bezier(HOVER_PREVIEW.follow.ease);
const noop = () => () => {};

/**
 * Dennis Snellenberg's work list: big rows, and a square preview that opens under the
 * cursor and eases after it (1.2s, retargeted on every move). The images sit in one
 * column that slides to the hovered row. Rows open the case study when there is one,
 * otherwise the live site. On touch screens each row shows its screenshot inline.
 */
export function WorkRows({ className }: { className?: string }) {
  const projects = design.projects;
  const list = useRef<HTMLUListElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  /* the card is fixed to the viewport, so it lives in <body>, clear of any transformed ancestor */
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    const ul = list.current, pv = card.current;
    if (!ul || !pv || !hasFinePointer()) return;
    const reduced = prefersReducedMotion();
    const pos = { x: 0, y: 0 };
    const pointer = { x: -1, y: -1 };
    let stop: (() => void) | undefined;
    let open = false;
    const place = () => {
      pv.style.translate = `${pos.x}px ${pos.y}px`;
    };
    const follow = (x: number, y: number) => {
      if (reduced) {
        pos.x = x; pos.y = y; place();
        return;
      }
      stop?.();
      const fx = pos.x, fy = pos.y;
      stop = tween(HOVER_PREVIEW.follow.duration, followEase, (k) => {
        pos.x = fx + (x - fx) * k;
        pos.y = fy + (y - fy) * k;
        place();
      });
    };
    const rowAt = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-row]");
      return el && ul.contains(el) ? Number(el.dataset.row) : null;
    };
    const onEnter = (e: PointerEvent) => {
      if (!open) {
        stop?.();
        pos.x = e.clientX; pos.y = e.clientY; place();
      }
    };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      const i = rowAt(e.clientX, e.clientY);
      open = i !== null;
      setActive(i);
      if (i !== null) setShown(i);
      follow(e.clientX, e.clientY);
    };
    const onLeave = () => {
      open = false;
      setActive(null);
    };
    /* rows move under a still cursor while the page scrolls */
    const onScroll = () => {
      if (pointer.x < 0) return;
      const i = rowAt(pointer.x, pointer.y);
      open = i !== null;
      setActive(i);
      if (i !== null) setShown(i);
    };
    ul.addEventListener("pointerenter", onEnter);
    ul.addEventListener("pointermove", onMove);
    ul.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      stop?.();
      ul.removeEventListener("pointerenter", onEnter);
      ul.removeEventListener("pointermove", onMove);
      ul.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mounted]);

  const vars = {
    "--kit-pv-size": HOVER_PREVIEW.size,
    "--kit-pv-open": `${HOVER_PREVIEW.open.duration}ms`,
    "--kit-pv-open-ease": cssEase(HOVER_PREVIEW.open.ease),
    "--kit-pv-close": `${HOVER_PREVIEW.close.duration}ms`,
    "--kit-pv-close-ease": cssEase(HOVER_PREVIEW.close.ease),
    "--kit-pv-swap": `${HOVER_PREVIEW.swap.duration}ms`,
    "--kit-pv-swap-ease": cssEase(HOVER_PREVIEW.swap.ease),
    "--kit-row-shift": HOVER_PREVIEW.rowShift,
    "--kit-row-dur": `${HOVER_PREVIEW.row.duration}ms`,
    "--kit-row-ease": cssEase(HOVER_PREVIEW.row.ease),
  } as CSSProperties;

  return (
    <div className={className} style={vars}>
      <ul ref={list} className={styles.rows}>
        {projects.map((p, i) => {
          const internal = Boolean(caseStudyOf(p.slug));
          const inner = (
            <>
              <h3 className={styles.rowTitle}>{p.name}</h3>
              <span className={`${styles.rowMeta} ${styles.rowPlace}`}>{p.sector}</span>
              <span className={styles.rowMeta}>{p.place}</span>
              <span className={styles.thumb}>
                <Image src={p.images.hero} alt={p.images.alt} fill sizes="92vw" />
              </span>
            </>
          );
          return (
            <li key={p.slug}>
              {internal ? (
                <Link href={`/work/${p.slug}`} className={styles.row} data-row={i}>
                  {inner}
                </Link>
              ) : (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.row} data-row={i}>
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {mounted
        ? createPortal(
      <div ref={card} className={styles.preview} style={vars} data-open={active !== null ? "" : undefined} aria-hidden>
        <span className={styles.view}>View</span>
        <div className={styles.strip} style={{ transform: `translateY(${-shown * 100}%)` }}>
          {projects.map((p) => (
            <div key={p.slug}>
              <Image src={p.images.hero} alt="" fill sizes={HOVER_PREVIEW.size} />
            </div>
          ))}
        </div>
      </div>,
            document.body,
          )
        : null}
    </div>
  );
}
