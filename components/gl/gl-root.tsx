"use client";

import { useLenis } from "lenis/react";
import { cancelFrame, frame } from "motion/react";
import { useEffect, useRef } from "react";

/** Mounts the shared WebGL stage once three.js has loaded, after the page is interactive. */
export function GLRoot() {
  const ref = useRef<HTMLCanvasElement>(null);
  // Speed in the WebGL field is how far smooth scrolling lags behind the wheel.
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    const start = async () => {
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;
      const { Stage } = await import("@/lib/gl/stage");
      if (disposed || !ref.current) return;
      const still = new URLSearchParams(window.location.search).has("still");
      const stage = new Stage(ref.current, { still });
      stage.setLag(() => {
        const l = lenisRef.current;
        return l ? l.targetScroll - l.animatedScroll : 0;
      });
      document.documentElement.dataset.gl = "on";
      let last = performance.now();
      const loop = ({ timestamp }: { timestamp: number }) => {
        const dt = Math.min(0.05, (timestamp - last) / 1000);
        last = timestamp;
        stage.render(dt);
      };
      frame.render(loop, true);
      stop = () => {
        cancelFrame(loop);
        stage.dispose();
        delete document.documentElement.dataset.gl;
      };
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const id = idle(() => void start());
    return () => {
      disposed = true;
      (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
      stop?.();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
