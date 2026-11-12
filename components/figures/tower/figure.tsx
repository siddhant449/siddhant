"use client";

import { AnimatePresence, m } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { stack } from "@/lib/content";
import { useStack } from "@/lib/stack-context";
import "./tower.css";

const load = () => import("./scene");
const Placeholder = () => <div className="tw-placeholder" aria-hidden />;
const TowerScene = dynamic(load, { ssr: false, loading: Placeholder });

const EASE = [0.22, 1, 0.36, 1] as const;

/** The active layer's proof, swapped word by word. */
function Proof({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.p key={text} className="tw-proof" exit={{ opacity: 0, y: -8, filter: "blur(6px)" }} transition={{ duration: 0.3, ease: EASE }}>
        {words.map((w, i) => (
          <m.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: "0.4em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.04 + i * 0.026 }}
          >
            {w}
            {i < words.length - 1 ? " " : null}
          </m.span>
        ))}
      </m.p>
    </AnimatePresence>
  );
}

/**
 * The tower in its card. The card renders at once, at its final size; the
 * drawing (about 1,100 paths) stays out of the page's HTML: its code is
 * fetched in idle time after the intro and it mounts as the section nears.
 */
export function TowerFigure() {
  const { active } = useStack();
  const layer = stack.layers[active] ?? stack.layers[0];
  const slot = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Fetch the drawing's code once the intro is over and the page is idle.
    const warm = () => void load();
    const idle = typeof window.requestIdleCallback === "function";
    let idleId = 0;
    const later = window.setTimeout(() => {
      idleId = idle ? window.requestIdleCallback(warm, { timeout: 6000 }) : window.setTimeout(warm, 1500);
    }, 3500);

    const node = slot.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "1200px 0px" },
    );
    if (node) io.observe(node);

    return () => {
      io.disconnect();
      window.clearTimeout(later);
      if (idle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  return (
    <div className="iso tw-figure">
      <figure className="iso-plate tw-card">
        <figcaption className="tw-caption">
          <p className="tw-layer">
            Layer {String(active + 1).padStart(2, "0")} of {String(stack.layers.length).padStart(2, "0")}, {layer.name}
          </p>
          <Proof text={layer.proof} />
        </figcaption>
        <div ref={slot} className="tw-stage">
          {show ? <TowerScene /> : <Placeholder />}
        </div>
        <div className="iso-plate-corners" aria-hidden="true">
          <span className="iso-plate-corner" data-corner="hint">
            Scroll, or click a floor
          </span>
          <span className="iso-plate-corner" data-corner="readout" data-readout="">
            Floor 01, Interface: capsule loaded
          </span>
        </div>
      </figure>
    </div>
  );
}
