"use client";

import { AnimatePresence, m, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

type Mode = "idle" | "link" | "label";

/**
 * A difference-blended dot that follows the pointer. It swells over links and
 * becomes a labelled pill over anything marked with data-cursor-label, so the
 * pointer always says what a click will do. Mouse and trackpad only.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 900, damping: 60, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 900, damping: 60, mass: 0.35 });
  const lx = useSpring(x, { stiffness: 260, damping: 30, mass: 0.6 });
  const ly = useSpring(y, { stiffness: 260, damping: 30, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fine.matches && !reduce.matches);
    update();
    fine.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    }
    function onOver(e: PointerEvent) {
      const target = e.target as Element | null;
      const labelled = target?.closest<HTMLElement>("[data-cursor-label]");
      if (labelled) {
        setLabel(labelled.dataset.cursorLabel ?? "");
        setMode("label");
        return;
      }
      if (target?.closest("a, button, [role='button'], summary, label")) {
        setMode("link");
        return;
      }
      setMode("idle");
    }
    function onLeave() {
      setVisible(false);
    }
    function onDown() {
      setPressed(true);
    }
    function onUp() {
      setPressed(false);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  // Over links the dot shrinks instead of swelling, so it never covers the label.
  const dotScale = mode === "link" ? 0.45 : mode === "label" ? 0 : 1;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      <m.div
        className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-chalk mix-blend-difference"
        style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
        animate={{ scale: visible ? dotScale * (pressed ? 0.7 : 1) : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      />
      <m.div
        className="absolute left-0 top-0"
        style={{ x: lx, y: ly, translateX: "-50%", translateY: "-50%" }}
      >
        <AnimatePresence>
          {visible && mode === "label" && (
            <m.span
              key={label}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: pressed ? 0.9 : 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="block whitespace-nowrap rounded-full bg-chalk px-4 py-2.5 text-[13px] font-semibold leading-none text-ink"
            >
              {label}
            </m.span>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  );
}
