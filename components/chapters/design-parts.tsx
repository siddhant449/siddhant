"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { onReady } from "@/components/loader";
import s from "./design-chapter.module.css";

const STAGGER = 38; // ms per letter (logged on 14islands)
const LINE_TWO = 190; // ms the second line trails the first

/** Letters as spans, grouped per word so lines only break between words. */
function Chars({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          <span className="whitespace-nowrap">
            {[...w].map((c, i) => (
              <span key={i} className={s.ch}>
                {c}
              </span>
            ))}
          </span>
          {wi < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

/** Stagger the letters in each group in, the groups offset by `offsets`. */
function playIn(groups: (HTMLElement | null)[], offsets: number[]) {
  groups.forEach((g, gi) => {
    g?.querySelectorAll<HTMLElement>(`.${s.ch}`).forEach((el, i) => {
      el.style.transitionDelay = `${offsets[gi] + i * STAGGER}ms`;
      el.removeAttribute("data-out");
      el.setAttribute("data-in", "");
    });
  });
}

/** The chapter title: "Designed / & built", letters in on first view. */
export function ChapterTitle({ first, amp, second, id }: { first: string; amp: string; second: string; id: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const r1 = useRef<HTMLSpanElement>(null);
  const ra = useRef<HTMLSpanElement>(null);
  const r2 = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.classList.add(s.armed);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(() => playIn([r1.current, ra.current, r2.current], [0, 80, 120])));
      },
      { threshold: 0.3 },
    );
    const off = onReady(() => io.observe(el));
    return () => {
      off();
      io.disconnect();
    };
  }, [reduced]);
  return (
    <h2 ref={ref} id={id} className={s.h1} aria-label={`${first} ${amp === "&" ? "and" : amp} ${second}`}>
      <span className={s.row} aria-hidden>
        <span ref={r1}>
          <Chars text={first} />
        </span>
      </span>
      <span className={s.row} aria-hidden>
        <span ref={ra} className={`${s.amp} ${s.soft}`}>
          <Chars text={amp} />
        </span>
        <span ref={r2} className={s.r2}>
          <Chars text={second} />
        </span>
      </span>
    </h2>
  );
}

/** The two-line statement that rotates through pairs, letter by letter (3.8s each). */
export function PairCarousel({ pairs }: { pairs: readonly (readonly [string, string])[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const l1 = useRef<HTMLSpanElement>(null);
  const l2 = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const armed = useRef(false);

  // Each new pair plays in once it has rendered.
  useEffect(() => {
    if (armed.current) requestAnimationFrame(() => requestAnimationFrame(() => playIn([l1.current, l2.current], [0, LINE_TWO])));
  }, [index]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.classList.add(s.armed);
    let timer = 0;
    let swap = 0;
    let visible = false;
    let started = false;
    const next = () => {
      const chars = el.querySelectorAll<HTMLElement>(`.${s.ch}`);
      chars.forEach((c, i) => {
        c.style.transitionDelay = `${i * 12}ms`;
        c.setAttribute("data-out", "");
      });
      swap = window.setTimeout(() => setIndex((i) => (i + 1) % pairs.length), 420 + chars.length * 12);
    };
    const sync = () => {
      window.clearInterval(timer);
      timer = 0;
      if (visible && !document.hidden && started) timer = window.setInterval(next, 3800);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !started) {
          started = true;
          armed.current = true;
          playIn([l1.current, l2.current], [0, LINE_TWO]);
        }
        sync();
      },
      { threshold: 0.4 },
    );
    const off = onReady(() => io.observe(el));
    document.addEventListener("visibilitychange", sync);
    return () => {
      off();
      io.disconnect();
      window.clearInterval(timer);
      window.clearTimeout(swap);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduced, pairs.length]);

  const [a, b] = pairs[index];
  return (
    <>
      <p className="sr-only">{pairs.map((p) => `${p[0]}: ${p[1]}.`).join(" ")}</p>
      <p ref={ref} className={s.h2} aria-hidden>
        <span ref={l1} key={`a${index}`} className={`${s.l1} ${s.soft}`}>
          <Chars text={a} />
        </span>
        <span ref={l2} key={`b${index}`} className={s.l2}>
          <Chars text={b} />
        </span>
      </p>
    </>
  );
}

/** The media card: the live sites crossfade every 2.6s (the reference plays a video here). */
export function Reel({ images, label }: { images: readonly string[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [on, setOn] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let timer = 0;
    let visible = false;
    const sync = () => {
      window.clearInterval(timer);
      timer = 0;
      if (visible && !document.hidden) timer = window.setInterval(() => setOn((i) => (i + 1) % images.length), 2600);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduced, images.length]);
  return (
    <div ref={ref} className={s.media} role="img" aria-label={label}>
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="(min-width: 760px) 92vw, 100vw"
          className={`${s.reelImg} object-cover object-top`}
          data-on={i === on ? "" : undefined}
        />
      ))}
    </div>
  );
}
