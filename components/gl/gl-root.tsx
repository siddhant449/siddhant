"use client";

import { useLenis } from "lenis/react";
import { cancelFrame, frame } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Stage } from "@/lib/gl/stage";

const SELECTOR = '[data-gl="image"], [data-gl="showcase"], [data-gl="liquid"]';

/**
 * Mounts the shared WebGL stage. three.js loads only once a WebGL element comes within a screen
 * of the viewport, and the loop runs only while one is near the viewport and something moves
 * (scroll, the pointer over a board, a fade); otherwise the canvas is cleared and hidden.
 */
export function GLRoot() {
  const ref = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  // Speed in the WebGL field is how far smooth scrolling lags behind the wheel.
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);
  const rescan = useRef<() => void>(() => {});

  useEffect(() => {
    // Touch screens scroll on the compositor thread, so a fixed WebGL canvas redraws a frame
    // behind and the bending boards tear away from their titles on a fast flick. There the
    // boards keep their DOM version, which scrolls in perfect sync.
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
    if (!("WebGLRenderingContext" in window)) return;
    const canvas = ref.current;
    if (!canvas) return;

    let disposed = false;
    let stage: Stage | null = null;
    let loading = false;
    let running = false;
    let woke = false;
    let last = 0;
    const near = new Set<Element>();

    const measure = () => stage?.measure();
    const draw = ({ timestamp }: { timestamp: number }) => {
      if (!stage) return;
      const dt = Math.min(0.05, Math.max(0, (timestamp - last) / 1000));
      last = timestamp;
      const moving = stage.render(dt);
      if (!moving && !woke) stop();
      woke = false;
    };
    const start = () => {
      if (running || !stage || !near.size || document.hidden) return;
      running = true;
      last = performance.now();
      canvas.style.visibility = "";
      frame.preRender(measure, true);
      frame.render(draw, true);
    };
    function stop() {
      if (!running) return;
      running = false;
      cancelFrame(measure);
      cancelFrame(draw);
    }
    const wake = () => {
      woke = true;
      start();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") wake();
    };
    const onVis = () => (document.hidden ? stop() : wake());

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const { Stage } = await import("@/lib/gl/stage");
        if (disposed) return;
        const still = new URLSearchParams(window.location.search).has("still");
        stage = new Stage(canvas, { still });
      } catch {
        return; // no WebGL: the DOM boards stay
      }
      stage.setLag(() => {
        const l = lenisRef.current;
        return l ? l.targetScroll - l.animatedScroll : 0;
      });
      stage.onChange = wake;
      document.documentElement.dataset.gl = "on";
      window.addEventListener("scroll", wake, { passive: true });
      window.addEventListener("resize", wake);
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVis);
      wake();
    };

    // Near: within 300px of the viewport (the planes draw from 200px out). Soon: within a screen,
    // which is when three.js and the board textures load, in idle time.
    const nearIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) near.add(e.target);
          else near.delete(e.target);
        }
        if (near.size) wake();
        else {
          stop();
          stage?.idle();
          canvas.style.visibility = "hidden";
        }
      },
      { rootMargin: "300px 0px" },
    );
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const soonIO = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        soonIO.disconnect();
        idle(() => void load(), { timeout: 1200 });
      },
      { rootMargin: "100% 0px" },
    );
    const observe = () => {
      nearIO.disconnect();
      near.clear();
      const els = document.querySelectorAll(SELECTOR);
      els.forEach((el) => {
        nearIO.observe(el);
        if (!loading) soonIO.observe(el);
      });
      stage?.scan();
      if (!els.length) {
        stop();
        stage?.idle();
        canvas.style.visibility = "hidden";
      }
    };
    rescan.current = observe;
    canvas.style.visibility = "hidden";
    observe();

    return () => {
      disposed = true;
      rescan.current = () => {};
      nearIO.disconnect();
      soonIO.disconnect();
      stop();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVis);
      stage?.dispose();
      delete document.documentElement.dataset.gl;
    };
  }, []);

  // A new page may bring boards (or take them away): look again once it has rendered.
  useEffect(() => {
    const id = requestAnimationFrame(() => rescan.current());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <>
      {/* The page tint (design boards): behind the stage and the page, over the page background.
          A colour at a fixed opacity over ink is the same mix as a tinted --bg, without
          restyling the whole document on every frame of the change. */}
      <div
        data-page-tint=""
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-0 [transition:opacity_.35s_ease-in-out,background-color_.35s_ease-in-out]"
      />
      <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
    </>
  );
}
