"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { processCopy as c } from "@/lib/copy/pitch";
import s from "./process.module.css";

function BriefThumb() {
  return (
    <svg viewBox="0 0 96 77" aria-hidden>
      <rect width="96" height="77" fill="#ece4e1" />
      <g transform="rotate(-4 48 41)">
        <rect x="22" y="10" width="52" height="62" rx="3" fill="#fffaf8" />
        <g fill="#dcd0cc">
          <rect x="28" y="18" width="30" height="3" rx="1.5" />
          <rect x="28" y="26" width="40" height="2.5" rx="1.2" />
          <rect x="28" y="32" width="36" height="2.5" rx="1.2" fill="#ffb3a3" />
          <rect x="28" y="38" width="38" height="2.5" rx="1.2" />
          <rect x="28" y="44" width="26" height="2.5" rx="1.2" />
        </g>
      </g>
    </svg>
  );
}

function SystemThumb() {
  return (
    <svg viewBox="0 0 96 77" aria-hidden>
      <rect width="96" height="77" fill="#1b1513" />
      <path d="M20 26H48M48 26H76M48 26V54M48 54H76" fill="none" stroke="#c4b7b4" strokeOpacity=".5" />
      <g fill="#1b1513" stroke="#c4b7b4">
        <rect x="10" y="20" width="20" height="12" rx="2" />
        <rect x="38" y="20" width="20" height="12" rx="2" />
        <rect x="66" y="20" width="20" height="12" rx="2" />
        <rect x="38" y="48" width="20" height="12" rx="2" />
        <rect x="66" y="48" width="20" height="12" rx="2" />
      </g>
      <circle cx="48" cy="40" r="2.6" fill="#ff3a1a" />
    </svg>
  );
}

/** The clinical messaging system, drawn top to bottom, with one message travelling through it. */
function SystemFigure() {
  const ys = [30, 110, 190, 270, 350, 420];
  return (
    <svg viewBox="0 0 222 462" className={s.sys} role="img" aria-label="Architecture of the clinical messaging platform, from clients to the audit log.">
      {c.system.nodes.map(([name, sub], i) => (
        <g key={name}>
          <rect x="26" y={ys[i]} width="170" height="44" rx="8" fill="none" stroke="#c4b7b4" strokeOpacity=".55" />
          <text x="40" y={ys[i] + 19} fill="#f6efed" fontSize="12" fontWeight="500">
            {name}
          </text>
          <text x="40" y={ys[i] + 34} fill="#c4b7b4" fillOpacity=".6" fontSize="10">
            {sub}
          </text>
          {i < ys.length - 1 ? <path d={`M111 ${ys[i] + 44}V${ys[i + 1]}`} stroke="#c4b7b4" strokeOpacity=".35" /> : null}
        </g>
      ))}
      <text x="26" y="458" fill="#c4b7b4" fillOpacity=".55" fontSize="10">
        {c.system.footer}
      </text>
      <circle className={s.packet} cx="111" cy="74" r="4" fill="#ff3a1a" />
    </svg>
  );
}

/**
 * How a project runs, after Significa's hero: four words stacked large, the
 * current one in ink and the rest in grey, with a row of step cards and four
 * coloured panels beneath. Pinned while the section scrolls; each quarter of
 * the run moves to the next step.
 */
export function Process() {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setReady(true), { threshold: 0.05 });
    io.observe(el);
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      const p = run > 0 ? Math.min(0.999, Math.max(0, -r.top / run)) : 0;
      setStep(Math.floor(p * c.steps.length));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const on = (i: number) => (i <= step ? "" : undefined);

  return (
    <section ref={root} id="process" data-theme="paper" aria-labelledby="process-title" className={`${s.section} ${ready ? s.ready : ""}`}>
      <div className={s.pin}>
        <h2 id="process-title" className={s.stack} aria-label={`${c.label}: ${c.steps.map((x) => x.word).join(" ")}`}>
          {c.steps.map((x, i) => (
            <span key={x.word}>
              <span aria-hidden className={s.word} data-on={on(i)} style={{ "--i": i } as CSSProperties}>
                {x.word}
              </span>
              {i === 1 ? <br /> : i < c.steps.length - 1 ? " " : null}
            </span>
          ))}
        </h2>

        <ol className={s.cards}>
          {c.steps.map((x, i) => (
            <li key={x.word} className={s.card} data-on={i === step ? "" : undefined} aria-current={i === step ? "step" : undefined}>
              <div className={s.thumb}>
                {i === 0 ? <BriefThumb /> : null}
                {i === 1 ? <Image src="/work/skinrock/cover.webp" alt="" fill sizes="96px" /> : null}
                {i === 2 ? <SystemThumb /> : null}
                {i === 3 ? <Image src="/work/truvolt-hero.webp" alt="" fill sizes="96px" /> : null}
              </div>
              <div>
                <p className={s.cardTitle}>{x.title}</p>
                <p className={s.cardNote}>{x.note}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className={s.panels} aria-hidden>
          <div className={s.panel} data-on={on(0)}>
            <span className={s.panelLabel}>{c.steps[0].panel}</span>
            <div className={s.doc}>
              <p className={s.docTitle}>{c.brief.title}</p>
              {[70, 100, 86, 92, 60, 74, 100, 52].map((w, k) => (
                <div key={k} className={`${s.ln} ${k === 2 || k === 5 ? s.lnHot : ""}`} style={{ width: `${w}%` }} />
              ))}
              <p className={`${s.sig} t-it`}>{c.brief.signed}</p>
            </div>
          </div>
          <div className={s.panel} data-on={on(1)}>
            <span className={s.panelLabel}>{c.steps[1].panel}</span>
            <div className={s.device}>
              <span className={s.notch} />
              <div className={s.screen}>
                <Image src={c.shape.src} alt={c.shape.alt} width={780} height={1688} sizes="(max-width: 767px) 80px, 240px" />
              </div>
            </div>
          </div>
          <div className={s.panel} data-on={on(2)}>
            <span className={s.panelLabel}>{c.steps[2].panel}</span>
            <div className={s.device}>
              <span className={s.notch} />
              <div className={s.screen}>
                <SystemFigure />
              </div>
            </div>
          </div>
          <div className={s.panel} data-on={on(3)}>
            <span className={s.panelLabel}>{c.steps[3].panel}</span>
            <div className={s.device}>
              <span className={s.notch} />
              <div className={s.screen}>
                <Image src={c.launch.src} alt={c.launch.alt} width={780} height={1688} sizes="(max-width: 767px) 80px, 240px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
