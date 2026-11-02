"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { audio } from "@/lib/audio";
import { scrollTop } from "@/lib/scroll";
import { REEL, SCENES } from "@/lib/cues";
import { keyLight } from "@/lib/keylight";
import styles from "./SceneRail.module.css";

const ASH = [52, 49, 44];
const SMOKE = [142, 138, 131];
const BONE = [236, 231, 222];
const EMBER = [214, 160, 106];
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const SVG = "http://www.w3.org/2000/svg";

/** `placed` is the swell the tick was last drawn at, so a still tick is never rewritten. */
type Tick = { p: number; boundary: boolean; second: boolean; el: SVGLineElement; ext: number; placed: number; color: string };

/**
 * The scene rail: the edge of the film strip. A linear map of the whole scroll in its own
 * left gutter (a strip under the nav on phones), with frame-line ticks, a long mark at each
 * cut (doubled where the music blends), and one ember playhead. Hover or focus a scene to
 * see what it holds and how it's scored; click to jump, drag to scrub.
 */
export default function SceneRail() {
  const reduce = useReducedMotion() ?? false;
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const railRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useEffect(() => {
    const rail = railRef.current!;
    const track = trackRef.current!;
    const svg = svgRef.current!;
    const head = headRef.current!;
    const card = cardRef.current!;
    const now = nowRef.current!;
    const phone = window.matchMedia("(max-width: 800px)");

    const scenes = REEL.map((r, i) => ({ ...r, ...SCENES[r.id], link: linkRefs.current[i]!, top: 0, a: 0, b: 0 }));
    let G = { len: 0, S: 1, vertical: true, origin: 0 };
    let ticks: Tick[] = [];
    type Bound = { p: number; s: (typeof scenes)[number]; t?: Tick; t2?: Tick; flash: number };
    let bounds: Bound[] = [];
    // Which cut each boundary tick marks, looked up every frame.
    const boundOf = new Map<Tick, Bound>();

    const placeTick = (t: Tick) => {
      t.placed = t.ext;
      const v = G.vertical;
      const c0 = v ? (t.boundary ? 18 : 23) : t.boundary ? 5 : 11;
      const base = v ? (t.boundary ? (t.second ? 10 : 16) : 6) : t.boundary ? (t.second ? 14 : 22) : 10;
      const p = Math.round(t.p) + 0.5;
      if (v) {
        t.el.setAttribute("x1", String(c0));
        t.el.setAttribute("x2", String(c0 + base + t.ext));
        t.el.setAttribute("y1", String(p));
        t.el.setAttribute("y2", String(p));
      } else {
        t.el.setAttribute("y1", String(c0));
        t.el.setAttribute("y2", String(c0 + base));
        t.el.setAttribute("x1", String(p));
        t.el.setAttribute("x2", String(p));
      }
    };
    const makeTick = (p: number, boundary: boolean, second = false) => {
      const el = document.createElementNS(SVG, "line");
      svg.appendChild(el);
      const t: Tick = { p, boundary, second, el, ext: 0, placed: -1, color: "" };
      placeTick(t);
      return t;
    };

    // The rail is a straight map of the whole scroll, so a long pinned scene gets a long segment.
    const measure = () => {
      const vertical = !phone.matches;
      const r = track.getBoundingClientRect();
      const len = vertical ? r.height : r.width;
      const S = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      G = { len, S, vertical, origin: vertical ? r.top : r.left };
      for (const s of scenes) {
        const el = document.querySelector<HTMLElement>(s.href);
        s.top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
        s.a = clamp(s.top / S) * len;
      }
      scenes.forEach((s, i) => (s.b = i < scenes.length - 1 ? scenes[i + 1].a : len));
      for (const s of scenes) {
        const st = s.link.style;
        if (vertical) {
          st.top = `${s.a}px`;
          st.height = `${s.b - s.a}px`;
          st.left = "0";
          st.width = "";
        } else {
          st.left = `${s.a}px`;
          st.width = `${s.b - s.a}px`;
          st.top = "0";
          st.height = "";
        }
      }
      svg.replaceChildren();
      ticks = [];
      bounds = scenes.slice(1).map((s) => ({ p: s.a, s, flash: 0 }));
      const step = vertical ? 7 : 6;
      for (let p = 0; p <= len + 0.5; p += step) {
        if (bounds.some((b) => Math.abs(b.p - p) < 3.5)) continue;
        ticks.push(makeTick(p, false));
      }
      boundOf.clear();
      for (const b of bounds) {
        b.t = makeTick(b.p, true);
        ticks.push(b.t);
        boundOf.set(b.t, b);
        // A double mark where the music blends rather than cuts.
        if (b.s.mode === "blend" && b.s.cue !== scenes[scenes.indexOf(b.s) - 1]?.cue) {
          b.t2 = makeTick(b.p + 3, true, true);
          ticks.push(b.t2);
          boundOf.set(b.t2, b);
        }
      }
    };

    let active = -1;
    let pointer: number | null = null;
    let focusIdx = -1;
    const sceneAt = (p: number) => {
      let i = 0;
      while (i < scenes.length - 1 && p >= scenes[i + 1].a) i++;
      return i;
    };
    const setActive = (i: number) => {
      if (i === active) return;
      const first = active === -1;
      active = i;
      scenes.forEach((s, j) => (j === i ? s.link.setAttribute("aria-current", "location") : s.link.removeAttribute("aria-current")));
      now.innerHTML = `<b>${scenes[i].code}</b><span>${scenes[i].label}</span>`;
      // The one unprompted motion: on each cut the new scene's edge code prints and its mark flashes.
      if (!first && !reduce) {
        const l = scenes[i].link;
        l.classList.remove(styles.printing);
        void l.offsetWidth;
        l.classList.add(styles.printing);
        const b = bounds.find((x) => x.s === scenes[i]);
        if (b) b.flash = performance.now();
      }
    };

    const showCard = (i: number, p: number, viaKeyboard: boolean) => {
      if (!G.vertical) return;
      const s = scenes[i];
      const prev = scenes[i - 1];
      const into = clamp((p - s.a) / Math.max(1, s.b - s.a));
      const t = audio.track(s.cue);
      const edit = !prev ? "Opens the reel" : prev.cue === s.cue ? `Same song as ${prev.code}` : `${s.edit ?? "Cuts in"}, from ${prev.code}`;
      card.innerHTML =
        `<div class="${styles.cardHead}"><span class="${styles.cardCode}">${s.code}</span><span class="${styles.cardLabel}">${s.label}</span>` +
        `<span class="${styles.cardAt}">${viaKeyboard ? "" : `${Math.round(into * 100)}%`}</span></div>` +
        `<p class="${styles.cardWhat}">${s.what}</p>` +
        (t ? `<div class="${styles.cardRow}"><span>Score</span><span>${t.title}, ${t.artist}</span></div>` : "") +
        `<div class="${styles.cardRow}"><span>Edit</span><span>${edit}</span></div>` +
        `<p class="${styles.cardHint}">${viaKeyboard ? "Press Enter to jump to the start" : "Click to jump here, or drag to scrub"}</p>`;
      const y = G.origin + p;
      const h = card.offsetHeight || 150;
      const top = clamp(y - 22, 56, window.innerHeight - h - 56);
      card.style.top = `${top}px`;
      card.style.setProperty("--ly", `${y - top}px`);
      card.dataset.open = "1";
    };
    const hideCard = () => delete card.dataset.open;

    const toScroll = (p: number) => clamp(p / G.len) * G.S;
    const go = (y: number, smooth: boolean) => {
      const l = lenisRef.current;
      if (l) l.scrollTo(y, smooth ? { duration: 1.4, easing: (t: number) => 1 - Math.pow(1 - t, 3), force: true } : { immediate: true, force: true });
      else window.scrollTo(0, y);
    };
    const along = (e: PointerEvent) => (G.vertical ? e.clientY : e.clientX) - G.origin;

    let drag: { start: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = { start: along(e), moved: false };
      rail.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const p = along(e);
      if (e.pointerType !== "touch") pointer = clamp(p, 0, G.len);
      if (drag) {
        if (Math.abs(p - drag.start) > 3) drag.moved = true;
        if (drag.moved) go(toScroll(p), false);
      }
      if (pointer !== null) showCard(sceneAt(pointer), pointer, false);
    };
    const onUp = (e: PointerEvent) => {
      if (drag && !drag.moved) go(toScroll(clamp(along(e), 0, G.len)), !reduce);
      drag = null;
    };
    const onLeave = () => {
      if (!drag) {
        pointer = null;
        hideCard();
      }
    };
    const onCancel = () => (drag = null);
    // Links stay real links: pointer clicks are handled above; keyboard Enter jumps and hands focus over.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a");
      if (!a) return;
      e.preventDefault();
      if (e.detail !== 0) return;
      const s = scenes[Number(a.dataset.i)];
      go(s.top, !reduce);
      const target = document.querySelector<HTMLElement>(s.href);
      if (target && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      window.setTimeout(() => target?.focus({ preventScroll: true }), reduce ? 0 : 1450);
    };
    const onKey = (e: KeyboardEvent) => {
      let n: number | null = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = Math.min(scenes.length - 1, focusIdx + 1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = Math.max(0, focusIdx - 1);
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = scenes.length - 1;
      if (e.key === "Escape") hideCard();
      if (n !== null) {
        e.preventDefault();
        scenes[n].link.focus();
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a");
      if (!a) return;
      focusIdx = Number(a.dataset.i);
      if (a.matches(":focus-visible")) showCard(focusIdx, scenes[focusIdx].a, true);
    };
    const onFocusOut = () => {
      focusIdx = -1;
      if (pointer === null) hideCard();
    };

    rail.addEventListener("pointerdown", onDown);
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerup", onUp);
    rail.addEventListener("pointerleave", onLeave);
    rail.addEventListener("pointercancel", onCancel);
    rail.addEventListener("click", onClick);
    rail.addEventListener("keydown", onKey);
    rail.addEventListener("focusin", onFocusIn);
    rail.addEventListener("focusout", onFocusOut);

    let raf = 0;
    const frame = (t: number) => {
      // The scroll event's value: reading window.scrollY here would force a layout after other loops' writes.
      const pos = clamp(scrollTop() / G.S) * G.len;
      setActive(sceneAt(pos + 0.5));
      head.style.transform = G.vertical ? `translateY(${pos.toFixed(1)}px)` : `translateX(${pos.toFixed(1)}px)`;
      const key = keyLight.get();
      for (const tk of ticks) {
        // Dock-like swell toward the pointer (after Ruixen's Chapter Scrubber).
        const target = pointer === null ? 0 : 12 * Math.exp(-((tk.p - pointer) ** 2) / (2 * 15 * 15));
        const next = reduce ? target : tk.ext + (target - tk.ext) * 0.22;
        // The swell settles exactly on its target, so a tick at rest is left alone.
        tk.ext = Math.abs(target - next) < 0.05 ? target : next;
        if (G.vertical && tk.ext !== tk.placed) placeTick(tk);
        const passed = tk.p <= pos;
        let c = tk.boundary ? (passed ? BONE : SMOKE) : passed ? SMOKE : ASH;
        // The key light grazes the film edge at its own height.
        if (G.vertical) {
          const vy = (G.origin + tk.p) / window.innerHeight;
          const lit = key.w * Math.max(0, 1 - Math.abs(vy - key.y) / 0.22);
          c = mix(c, EMBER, lit * (passed ? 0.55 : 0.3));
        }
        if (tk.ext > 0.5) c = mix(c, BONE, Math.min(1, tk.ext / 12) * 0.6);
        const b = boundOf.get(tk);
        if (b?.flash) {
          const f = 1 - (t - b.flash) / 900;
          if (f > 0) c = mix(c, EMBER, f);
          else b.flash = 0;
        }
        const s = rgb(c);
        if (s !== tk.color) {
          tk.el.setAttribute("stroke", s);
          tk.color = s;
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(() => measure());
    ro.observe(document.body);
    phone.addEventListener("change", measure);
    void document.fonts?.ready.then(measure);
    measure();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      phone.removeEventListener("change", measure);
      rail.removeEventListener("pointerdown", onDown);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerup", onUp);
      rail.removeEventListener("pointerleave", onLeave);
      rail.removeEventListener("pointercancel", onCancel);
      rail.removeEventListener("click", onClick);
      rail.removeEventListener("keydown", onKey);
      rail.removeEventListener("focusin", onFocusIn);
      rail.removeEventListener("focusout", onFocusOut);
    };
  }, [reduce]);

  return (
    <>
      <nav ref={railRef} className={styles.rail} aria-label="Scenes">
        <div ref={nowRef} className={styles.now} aria-hidden />
        <div ref={trackRef} className={styles.track}>
          <svg ref={svgRef} className={styles.ticks} aria-hidden />
          <ol className={styles.scenes}>
            {REEL.map((r, i) => (
              <li key={r.id}>
                <a
                  ref={(el) => {
                    linkRefs.current[i] = el;
                  }}
                  className={styles.scene}
                  href={r.href}
                  // A native link drag would take the pointer and end a scrub after its first move.
                  draggable={false}
                  data-i={i}
                  aria-label={`${SCENES[r.id].code}, ${SCENES[r.id].label}`}
                >
                  <span className={styles.code} aria-hidden>
                    {SCENES[r.id].code.replace("SC.", "")}
                    <em>{SCENES[r.id].label}</em>
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <div ref={headRef} className={styles.head} aria-hidden />
        </div>
      </nav>
      <div ref={cardRef} className={styles.card} role="tooltip" aria-hidden />
    </>
  );
}
