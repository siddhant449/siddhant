"use client";

import { m, useScroll, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { onReady } from "@/components/loader";
import { sethHero, sethLinks } from "@/lib/copy/seth";
import c from "./cursor.module.css";
import { AsciiAquarium } from "@/components/ui/ascii-aquarium";
import { Ember } from "@/components/kit";
import s from "./seth-hero.module.css";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
/** Keep in step with the tablet media query in seth-hero.module.css. */
const STACKED = "(min-width: 721px) and (max-width: 1023px) and (orientation: portrait)";

/** Rects for a pixel speech bubble of W × H sprite pixels (rounded 2-step corners, tail lower left). */
function bubbleRects(W: number, H: number) {
  const out: { x: number; y: number; w: number; h: number; k: "fill" | "line" }[] = [];
  const R = (x: number, y: number, w: number, h: number, k: "fill" | "line") => out.push({ x, y, w, h, k });
  const bodyH = H - 3, tx = Math.round(W * 0.17);
  R(1, 1, W - 2, bodyH - 2, "fill");
  R(2, 0, W - 4, bodyH, "fill");
  R(0, 2, W, bodyH - 4, "fill");
  R(2, 0, W - 4, 1, "line");
  R(2, bodyH - 1, W - 4, 1, "line");
  R(0, 2, 1, bodyH - 4, "line");
  R(W - 1, 2, 1, bodyH - 4, "line");
  R(1, 1, 1, 1, "line");
  R(W - 2, 1, 1, 1, "line");
  R(1, bodyH - 2, 1, 1, "line");
  R(W - 2, bodyH - 2, 1, 1, "line");
  R(tx, bodyH - 1, 3, 1, "fill");
  R(tx, bodyH, 1, 2, "line");
  R(tx + 1, bodyH, 1, 1, "fill");
  R(tx + 1, bodyH + 1, 1, 1, "line");
  R(tx + 2, bodyH, 1, 1, "line");
  R(tx + 3, bodyH - 1, 1, 1, "line");
  return out;
}

/**
 * The first screen, rebuilt from sethlukin.com's hero: two words split by a pixel sprite, a speech
 * bubble, the ASCII aquarium (with butterflies) behind, two labels at the foot.
 *
 * Measured motion: after the entry curtain lifts, word one rises 152px and goes grey to white in
 * ~.45s, word two .4s later; the field fades in; the sprite pops (rise, overshoot, settle); the
 * bubble draws and types. On scroll the hero is pinned while it scales 1 → .8 and dims over the
 * first 100vh, and the next section rises over it.
 *
 * Wiring: the section after this one must be `position: relative; z-index: 1` with an opaque
 * background (the reference rounds its top corners, 3.333vw / 28px on phones).
 */
export function SethHero() {
  const watch = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const w1 = useRef<HTMLSpanElement>(null);
  const w2 = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLAnchorElement>(null);
  const ember = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [typed, setTyped] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [box, setBox] = useState<{ W: number; H: number } | null>(null);
  const label = sethHero.bubble;

  // scroll: pinned, scale 1 → .8 and dim to .5 over the first 100vh (linear, as measured)
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, (v) => 1 - 0.2 * Math.min(1, Math.max(0, v / (typeof window === "undefined" ? 900 : window.innerHeight))));
  const dim = useTransform(scrollY, (v) => 0.5 * Math.min(1, Math.max(0, v / (typeof window === "undefined" ? 900 : window.innerHeight))));

  // headline fit: both words share one size (reference: 177px / 170px, ~206px gap for the sprite)
  useIso(() => {
    const fit = () => {
      const a = w1.current, b = w2.current;
      if (!a || !b) return;
      const W = window.innerWidth;
      // Stacked layout (words over the bubble and ember): phones, and tablets held upright.
      const tablet = W > 720 && window.matchMedia(STACKED).matches;
      const phone = W <= 720 || tablet;
      a.style.fontSize = b.style.fontSize = "100px";
      const width = (el: HTMLElement) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().width;
      };
      const each = phone ? W * (tablet ? 0.78 : 0.86) : (W - 2 * 0.01667 * W - 0.155 * W) / 2;
      const fs = (100 * each) / Math.max(width(a), width(b));
      a.style.fontSize = b.style.fontSize = `${fs}px`;
      document.documentElement.style.setProperty("--l1h", `${fs * 0.8}px`);
      const top = phone ? "" : `${W * 0.2243 + (W * 0.1228 - fs * 1.2) / 2}px`;
      a.style.top = b.style.top = top;
      // Centre the ember in the gap between the two words (offset* ignores the intro transforms),
      // sized so the object reads larger than the lettering.
      const em = ember.current;
      if (em && !phone && em.offsetParent === a.offsetParent) {
        const size = Math.max(fs * 2.6, W * 0.2);
        const cx = (a.offsetLeft + a.offsetWidth + b.offsetLeft) / 2;
        const cy = a.offsetTop + a.offsetHeight / 2;
        em.style.width = `${size}px`;
        em.style.left = `${cx - size / 2}px`;
        em.style.top = `${cy - size / 2}px`;
        em.style.marginLeft = "0px";
      } else if (em) {
        em.style.width = em.style.left = em.style.top = em.style.marginLeft = "";
      }
      const bb = bubble.current?.getBoundingClientRect();
      if (bb) {
        const px = Math.max(3, Math.round(bb.width / 80));
        setBox({ W: Math.round(bb.width / px), H: Math.round(bb.height / px) });
      }
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // intro: starts as the curtain lifts (~.22s in), bubble types at ~70ms a character
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const off = onReady(() => {
      if (reduce) {
        setOn(true);
        setShowBubble(true);
        setTyped(label.length);
        return;
      }
      timers.push(
        window.setTimeout(() => setOn(true), 220),
        window.setTimeout(() => {
          setShowBubble(true);
          let i = 0;
          const iv = window.setInterval(() => {
            i += 1;
            setTyped(i);
            if (i >= label.length) window.clearInterval(iv);
          }, 70);
          timers.push(iv);
        }, 220 + 2100),
      );
    });
    return () => {
      off();
      timers.forEach((t) => {
        window.clearTimeout(t);
        window.clearInterval(t);
      });
    };
  }, [label]);

  const ready = typed >= label.length;

  return (
    <div className={s.pin}>
      <div ref={watch} className={s.watch} aria-hidden />
      <section
        id="top"
        data-theme="ink"
        aria-labelledby="hero-title"
        className={`${s.hero} ${c.area} ${on ? s.on : ""} ${ready ? s.ready : ""}`}
      >
        <m.div ref={stage} className={s.stage} style={{ scale }}>
          {/* The ASCII Aquarium (Louis Studios, via 21st.dev) in the deep violet palette, with the
              butterflies from our specimen drawn in its own tiles above the water. */}
          <div className={s.sea}>
            <AsciiAquarium
              decorative
              pointerOnWindow
              watchRef={watch}
              background="#110f17"
              gridColor="#181521"
              colors={["#b7a6ff", "#9d7cff", "#d6d0f5", "#6c5cf0"]}
              highlight="#f4f1ff"
              shoalColor="#8e88a6"
              minnowColor="#b2abcf"
              driftColor="#6d61c4"
              wakeColor="#7a7396"
              bubbleColor="#d8d2ef"
              butterflies={{ src: "/seth/butterfly.webp", count: 2, colors: ["#c9b8ff", "#a48cff"] }}
              style={{ minHeight: 0 }}
            />
          </div>
          <h1 id="hero-title" className="sr-only">
            {sethHero.title}
          </h1>
          <span ref={w1} className={`${s.word} ${s.w1}`} aria-hidden>
            {sethHero.words[0]}
          </span>
          <span ref={w2} className={`${s.word} ${s.w2}`} aria-hidden>
            {sethHero.words[1]}
          </span>

          <a ref={bubble} href={sethLinks.project} className={`${s.bubble} ${showBubble ? s.show : ""}`}>
            {box ? (
              <svg viewBox={`0 0 ${box.W} ${box.H}`} shapeRendering="crispEdges" aria-hidden preserveAspectRatio="none">
                {bubbleRects(box.W, box.H).map((r, i) => (
                  <rect key={i} className={r.k === "fill" ? s.fill : s.line} x={r.x} y={r.y} width={r.w} height={r.h} />
                ))}
              </svg>
            ) : null}
            <span className={s.bubbleText}>
              <span className={s.bubbleGhost}>{label}</span>
              <span className={s.bubbleTyped} aria-hidden>
                {label.slice(0, typed)}
              </span>
              <span className="sr-only">{label}</span>
            </span>
          </a>

          {/* The molten ember (kit) in the slot where Seth's pixel character stands. */}
          <div ref={ember} className={s.sprite} aria-hidden>
            <Ember className={s.ember} watch={watch} />
          </div>

          <p className={`${s.foot} ${s.footL} ${s.lbl}`}>
            {sethHero.left[0]}
            <br />
            {sethHero.left[1]}
          </p>
          <p className={`${s.foot} ${s.footR} ${s.lbl}`}>
            {sethHero.right[0]}
            <br />
            {sethHero.right[1]}
          </p>
        </m.div>
        <m.div className={s.dim} style={{ opacity: dim }} aria-hidden />
      </section>
    </div>
  );
}
