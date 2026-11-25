"use client";

import Image from "next/image";
import { frame, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { onReady } from "@/components/loader";
import { onScrollFrame } from "@/components/ui/theme";
import { capabilities, capabilitiesIntro as I } from "@/lib/copy/capabilities";
import { mountFigure, type FigureHandle } from "./figures";
import s from "./capabilities.module.css";

/*
 * Rows open as they scroll up, after cuberto.com "What we do" (logged per frame, 1440×900):
 * a row starts opening when its top reaches 68% of the viewport and is fully open at 25.5%.
 * Height and media opacity run close to linear (149 → 334 px there); the fill colour leads,
 * so it is nearly inverted by mid-travel. The first row is open from the start. The page's
 * Lenis scroller (lerp .09) supplies the smoothing the reference gets from its own.
 * Ember swap: closed rows are ink-2 with paper type; open rows turn to paper with ink type.
 */
const START = 0.68;
const RANGE = 0.425;
const INK2 = [27, 21, 19];
const PAPER = [246, 239, 237];
const INK = [15, 11, 10];
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function Capabilities() {
  const reduced = !!useReducedMotion();
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const rows = [...ol.children] as HTMLElement[];
    const parts = rows.map((el) => ({
      el,
      fill: el.querySelector<HTMLElement>("[data-fill]")!,
      media: el.querySelector<HTMLElement>("[data-media]")!,
      acc: el.querySelector<HTMLElement>("[data-acc]")!,
      content: el.querySelector<HTMLElement>("[data-content]")!,
      head: el.querySelector<HTMLElement>("[data-head]")!,
      space: el.querySelector<HTMLElement>("[data-figspace]")!,
      shown: -1,
      /** content height, cached by measure() so applying a frame never reads layout */
      ch: 0,
    }));
    const figs: FigureHandle[] = parts.map((p, i) =>
      mountFigure(p.el.querySelector("canvas")!, capabilities[i].figure, reduced),
    );

    const apply = (i: number, p: number) => {
      const part = parts[i];
      const h = 1 - Math.pow(1 - p, 1.25);
      const c = 1 - Math.pow(1 - p, 2.4);
      part.fill.style.background = mix(INK2, PAPER, c);
      part.el.style.color = mix(PAPER, INK, c);
      part.media.style.opacity = h.toFixed(3);
      part.acc.style.height = `${(part.ch * h).toFixed(1)}px`;
      figs[i].setActive(h > 0.02);
      part.shown = p;
    };
    const measure = () => {
      // all reads first, then the writes
      const m = parts.map((p) => ({
        pad: parseFloat(getComputedStyle(p.el).paddingTop),
        head: p.head.offsetHeight,
        ch: p.content.offsetHeight,
        space: p.space.offsetTop,
      }));
      parts.forEach((p, i) => {
        const { pad, head, ch, space } = m[i];
        p.ch = ch;
        p.el.style.setProperty("--oh", `${pad * 2 + head + ch}px`);
        // Phones: pin the figure to the space reserved under the tags (not the card's bottom),
        // so while a card is half open the figure is clipped from below and never covers the text.
        if (window.innerWidth <= 760) {
          p.media.style.top = `${space}px`;
          p.media.style.bottom = "auto";
        } else {
          p.media.style.top = p.media.style.bottom = "";
        }
        p.shown = -1;
      });
    };
    // Per frame: read every row's top (layout is clean in the read step), then apply the
    // writes in Motion's render step. A row opening pushes the rows below it down, so each
    // later top is corrected by the height the rows above it gained this frame.
    const update = () => {
      const H = window.innerHeight;
      const tops = parts.map((part, i) => (i === 0 || reduced ? 0 : part.el.getBoundingClientRect().top));
      const next: [number, number][] = [];
      let shift = 0;
      parts.forEach((part, i) => {
        if (i === 0 || reduced) {
          if (part.shown !== 1) next.push([i, 1]);
          return;
        }
        const p = clamp01((H * START - (tops[i] + shift)) / (H * RANGE));
        if (Math.abs(p - part.shown) > 0.0005) {
          const was = part.shown < 0 ? null : part.ch * (1 - Math.pow(1 - part.shown, 1.25));
          if (was !== null) shift += part.ch * (1 - Math.pow(1 - p, 1.25)) - was;
          next.push([i, p]);
        }
      });
      if (next.length) frame.render(() => next.forEach(([i, p]) => apply(i, p)));
    };
    const remeasure = () => {
      measure();
      update();
    };
    measure();
    update();
    // Rows are measured only while the list is near the viewport.
    let offScroll = () => {};
    const near = new IntersectionObserver(
      ([e]) => {
        offScroll();
        offScroll = e.isIntersecting ? onScrollFrame(update) : () => {};
      },
      { rootMargin: "50% 0px" },
    );
    near.observe(ol);
    window.addEventListener("resize", remeasure);
    let alive = true;
    void document.fonts?.ready.then(() => alive && remeasure());

    // Entrance: the list fades in once the curtain has lifted and it reaches the viewport.
    let io: IntersectionObserver | null = null;
    if (reduced) ol.dataset.in = "";
    const off = onReady(() => {
      io = new IntersectionObserver(
        (e) => {
          if (e[0].isIntersecting) {
            ol.dataset.in = "";
            io?.disconnect();
          }
        },
        { threshold: 0.05 },
      );
      io.observe(ol);
    });

    return () => {
      alive = false;
      off();
      io?.disconnect();
      near.disconnect();
      offScroll();
      window.removeEventListener("resize", remeasure);
      figs.forEach((f) => f.destroy());
    };
  }, [reduced]);

  return (
    <div className={s.root}>
      <div className={s.intro}>
        <p className={s.label}>{I.label}</p>
        <h2 id="engineering-chapter-title" className={s.statement}>
          {I.statement[0]}
          <em className={s.accent}>{I.statement[1]}</em>
          {I.statement[2]}
        </h2>
      </div>

      <ol ref={list} className={s.list}>
        {capabilities.map((c) => (
          <li key={c.id} className={s.row}>
            <div data-fill className={s.fill} />
            <div data-media className={s.media} aria-hidden>
              <Image src={c.plate} alt="" fill sizes="600px" className={s.plate} />
              <canvas className={s.canvas} />
            </div>
            <div data-head>
              <h3 className={s.title}>{c.title}</h3>
            </div>
            <div data-acc className={s.acc}>
              <div data-content className={s.content}>
                <p className={s.text}>{c.text}</p>
                <ul className={s.tags} aria-label={`${c.title} tools`}>
                  {c.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <div data-figspace className={s.figSpace} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
