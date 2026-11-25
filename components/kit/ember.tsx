"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { EmberHandle } from "@/lib/kit/ember-scene";
import { onReady } from "@/components/loader";
import { prefersReducedMotion } from "@/lib/kit/motion";
import styles from "./kit.module.css";

/**
 * The ember: a molten object in three.js, for the hero or the footer.
 * three.js is imported only on the client, after the first screen has painted. A still render
 * shows first, stays if WebGL is unavailable, and fades once the live one is ready.
 * Reduced motion renders one still frame. Paused off screen and in hidden tabs.
 * Size it through className (it fills its box).
 */
export function Ember({
  className,
  heat = 1,
  watch,
}: {
  className?: string;
  heat?: number;
  /** Decides when the ember is on screen, for a host inside a pinned screen that can be covered. */
  watch?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<EmberHandle | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = ref.current;
    if (!host || !("WebGLRenderingContext" in window)) return;
    let disposed = false;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    let id = 0;
    // three.js loads after the first screen has painted: once the entry curtain lifts, in idle time.
    const off = onReady(() => {
      id = idle(
        () => {
          void import("@/lib/kit/ember-scene").then(({ mountEmber }) => {
            if (disposed) return;
            try {
              handle.current = mountEmber(host, {
                heat,
                still: prefersReducedMotion(),
                watch: watch?.current ?? undefined,
                onReady: () => {
                  if (!disposed) setReady(true);
                },
              });
            } catch {
              // no WebGL: the still image stays
            }
          });
        },
        { timeout: 1500 },
      ) as number;
    });
    return () => {
      disposed = true;
      off();
      cancelIdle(id);
      handle.current?.dispose();
      handle.current = null;
    };
    // heat updates go through setHeat below; mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handle.current?.setHeat(heat);
  }, [heat]);

  return (
    <div ref={ref} className={`${styles.ember} ${className ?? ""}`} data-ready={ready ? "" : undefined}>
      {/* The hero's LCP element: fetched eagerly at the size it shows (the slot is ~20-32vw, 190px on phones). */}
      <Image
        src="/kit/ember-still.webp"
        alt=""
        width={560}
        height={560}
        sizes="(max-width: 720px) 190px, (max-width: 1023px) 34vw, 32vw"
        loading="eager"
        fetchPriority="high"
        className={styles.emberStill}
        aria-hidden
      />
    </div>
  );
}
