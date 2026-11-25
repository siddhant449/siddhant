"use client";

import { m, useScroll, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { sethFooter, sethLinks } from "@/lib/copy/seth";
import c from "./cursor.module.css";
import { attachDotField, type HandsLayout } from "./dot-field";
import { PixelDoc, PixelMail, SethClock, SethYear, useCopyEmail } from "./parts";
import s from "./seth-footer.module.css";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The site footer, rebuilt from sethlukin.com's footer.
 *
 * Measured: the footer is fixed under the page and uncovered by the final 100vh of scroll; over that
 * range line one travels 190px left, line two 190px right, and the buttons rise 95px. Behind it the
 * shared dot field draws the two hands from Michelangelo's Creation of Adam across the full width,
 * slightly tilted, as dim red dots that brighten toward the fingertip gap at the centre. Wiring: no ancestor may have a transform, or `position: fixed` breaks.
 */
export function SethFooterView({ now }: { now?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ft = useRef<HTMLElement>(null);
  const l1 = useRef<HTMLSpanElement>(null);
  const l2 = useRef<HTMLSpanElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const btns = useRef<HTMLDivElement>(null);
  const relayout = useRef<() => void>(() => {});
  const top = useCopyEmail();
  const pill = useCopyEmail();
  const [vw, setVw] = useState(1440);

  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start end", "end end"] });
  const phone = vw <= 720;
  const x1 = useTransform(scrollYProgress, (p) => (phone ? 0.06 : 0.132) * vw * (1 - p));
  const x2 = useTransform(scrollYProgress, (p) => -(phone ? 0.06 : 0.132) * vw * (1 - p));
  const y = useTransform(scrollYProgress, (p) => (phone ? 0.08 : 0.066) * vw * (1 - p));

  useEffect(() => {
    const el = ft.current, w = wrap.current;
    if (!el || !w) return;
    // rest positions (offsets ignore the scroll transforms), in footer px
    // the fingertip gap sits at the centre, in the band between the headline and the buttons
    // (offsets ignore the scroll transforms); the arms run in from both edges
    const layout = (W: number, H: number): HandsLayout => {
      const h = head.current, b = l2.current, bt = btns.current;
      const band = h && b && bt ? (h.offsetTop + b.offsetTop + b.offsetHeight + bt.offsetTop) / 2 : H / 2;
      const y = Math.min(H * 0.58, Math.max(H * 0.42, band));
      return { x: W / 2, y, s: W / (W <= 720 ? 620 : 1150), tilt: -0.13 };
    };
    const { detach, setPointer, relayout: re } = attachDotField(el, "hands", () => {}, w, layout);
    relayout.current = re;
    const move = (e: PointerEvent) => setPointer(e.clientX, e.clientY, true);
    const leave = (e: PointerEvent) => setPointer(e.clientX, e.clientY, false);
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerdown", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", move);
      el.removeEventListener("pointerleave", leave);
      relayout.current = () => {};
      detach();
    };
  }, []);

  // phone: fit each line to the reference's measured widths (363px and 330px of 390)
  useIso(() => {
    const fit = () => {
      setVw(window.innerWidth);
      const a = l1.current, b = l2.current;
      if (!a || !b) return;
      a.style.fontSize = b.style.fontSize = "";
      const W = window.innerWidth;
      const width = (el: HTMLElement) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().width;
      };
      const targets: [HTMLElement, number][] = W <= 720 ? [[a, 0.93], [b, 0.846]] : [[a, 0.749], [b, 0.681]];
      for (const [el, f] of targets) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${Math.min(fs * 1.4, (fs * W * f) / width(el))}px`;
      }
      wrap.current?.style.setProperty("--l1h", `${a.getBoundingClientRect().height}px`);
      relayout.current();
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div ref={wrap} id="contact" className={s.wrap} data-theme="ink">
      <footer ref={ft} className={`${s.ft} ${c.area}`} aria-labelledby="contact-title">
        <div className={s.ui}>
          <nav className={`${s.top} ${s.lbl}`} aria-label="Contact and profiles">
            <button type="button" className={`${s.mail} ${s.u}`} onClick={top.copy}>
              {top.copied ? (
                sethFooter.copied
              ) : (
                <>
                  <span className={s.long}>{sethLinks.email}</span>
                  <span className={s.short}>Email</span>
                </>
              )}
            </button>
            {sethFooter.links.map((l, i) => (
              <a key={l.label} className={`${[s.li, s.gh, s.cv][i]} ${s.u}`} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            ))}
          </nav>

          <h2 ref={head} id="contact-title" className={s.head}>
            <m.span ref={l1} className={`${s.line} ${s.l1}`} style={{ x: x1 }}>
              {sethFooter.lines[0]}
            </m.span>
            <m.span ref={l2} className={`${s.line} ${s.l2}`} style={{ x: x2 }}>
              {sethFooter.lines[1]}
            </m.span>
          </h2>

          <m.div ref={btns} className={s.btns} style={{ y }}>
            <a className={s.pill} href={sethLinks.project}>
              <PixelDoc />
              <span>{sethFooter.start}</span>
            </a>
            <button type="button" className={`${s.pill} ${pill.copied ? s.copied : ""}`} onClick={pill.copy}>
              <PixelMail />
              <span className={s.lab}>
                <span className={s.idle}>{sethFooter.copy}</span>
                <span className={s.done} aria-hidden>
                  {sethFooter.copied}
                </span>
              </span>
              <span className="sr-only" aria-live="polite">
                {pill.copied || top.copied ? "Email address copied to clipboard" : ""}
              </span>
            </button>
          </m.div>

          {now}

          <p className={`${s.meta} ${s.city} ${s.lbl}`}>
            {sethFooter.place}
            <span className={s.clock}>
              <SethClock colonClass={s.colon} /> IST
            </span>
          </p>
          <p className={`${s.meta} ${s.avail} ${s.lbl}`}>
            <span className={s.dot} aria-hidden />
            {sethFooter.status}
            <br />© <SethYear />
          </p>
        </div>
      </footer>
    </div>
  );
}
