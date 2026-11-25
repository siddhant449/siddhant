"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { EmberHandle } from "@/lib/kit/ember-scene";
import { prefersReducedMotion } from "@/lib/kit/motion";
import styles from "./kit.module.css";

/**
 * The ember: a molten object in three.js, for the hero or the footer.
 * three.js is imported only on the client, after the page is idle. A still render
 * shows first, stays if WebGL is unavailable, and fades once the live one is ready.
 * Reduced motion renders one still frame. Paused off screen and in hidden tabs.
 * Size it through className (it fills its box).
 */
export function Ember({ className, heat = 1 }: { className?: string; heat?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<EmberHandle | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let disposed = false;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => {
      void import("@/lib/kit/ember-scene").then(({ mountEmber }) => {
        if (disposed) return;
        handle.current = mountEmber(host, {
          heat,
          still: prefersReducedMotion(),
          onReady: () => {
            if (!disposed) setReady(true);
          },
        });
      });
    });
    return () => {
      disposed = true;
      cancelIdle(id as number);
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
      <Image src="/kit/ember-still.webp" alt="" width={560} height={560} className={styles.emberStill} aria-hidden />
    </div>
  );
}
