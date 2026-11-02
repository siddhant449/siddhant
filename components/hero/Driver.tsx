"use client";
/* The loop flags are mutable module state shared with the scene's section and written outside React (the R3F idiom). */
/* eslint-disable react-hooks/immutability */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { Loop } from "./loop";

/**
 * Drives an R3F canvas set to frameloop="never" from its own rAF: every frame while
 * `loop.running`, and once whenever `loop.dirty` (once its scene has loaded, so its shaders
 * compile ahead of time, and after a resize). A scene starts and stops drawing by flipping a
 * flag, so a cut costs no React render and no canvas re-render.
 */
export function Driver({ loop }: { loop: Loop }) {
  const advance = useThree((s) => s.advance);
  const size = useThree((s) => s.size);
  // Mounted once the scene's assets have loaded (it suspends with them), and resized: one frame owed.
  useEffect(() => {
    loop.dirty = true;
  }, [loop, size]);
  useEffect(() => {
    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (!loop.running && !loop.dirty) return;
      loop.dirty = false;
      advance(t / 1000);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [advance, loop]);
  return null;
}
