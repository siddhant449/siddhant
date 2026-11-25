"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { onReady } from "@/components/loader";
import s from "./chapter-title.module.css";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Props = {
  /** The very large word, e.g. "Website". */
  word: string;
  /** Two lines under it; the last part of the second line is set in the italic accent. */
  sub: [string, string, string];
  theme: "paper" | "ink";
  id?: string;
};

/**
 * A chapter title after Rejouice's engagement panels (rejouice.com/services):
 * one very large light word rising out of its line over 1.8s
 * (cubic-bezier(.16,1,.3,1)), then the two-line statement rising word by word
 * (1.2s, 30ms apart). Plays once, when it scrolls into view after the entry
 * curtain has lifted.
 */
export function ChapterTitle({ word, sub, theme, id }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const giant = useRef<HTMLParagraphElement>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => onReady(() => setReady(true)), []);
  // The CSS sizes the word by the viewport; on narrow screens a wide word can still run past the
  // padding, so shrink it to fit its line (offsetWidth ignores the rise transform).
  useIso(() => {
    const p = giant.current;
    const w = p?.firstElementChild as HTMLElement | null;
    if (!p || !w) return;
    const fit = () => {
      p.style.fontSize = "";
      const room = p.clientWidth;
      const need = w.offsetWidth;
      if (need > room) p.style.fontSize = `${(parseFloat(getComputedStyle(p).fontSize) * room * 0.98) / need}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const lines = [sub[0].split(" "), [...sub[1].trimEnd().split(" "), `\u0000${sub[2]}`]];
  let n = 0;

  return (
    <div
      ref={root}
      id={id}
      data-theme={theme}
      className={`${s.title} ${theme === "ink" ? s.ink : ""} ${inView && ready ? s.in : ""}`}
    >
      <p ref={giant} className={s.giant} aria-hidden>
        <span>{word}</span>
      </p>
      <h2 className={s.sub} aria-label={`${word}. ${sub[0]} ${sub[1]}${sub[2]}`}>
        {lines.map((ws, li) => (
          <span key={li} className={s.line} aria-hidden>
            {ws.map((w) => {
              const i = n++;
              const italic = w.startsWith("\u0000");
              return (
                <Fragment key={i}>
                  <span className={s.wd}>
                    <span style={{ "--i": i } as CSSProperties} className={italic ? `t-it ${s.it}` : undefined}>
                      {italic ? w.slice(1) : w}
                    </span>
                  </span>
                  {italic ? null : " "}
                </Fragment>
              );
            })}
          </span>
        ))}
      </h2>
    </div>
  );
}
