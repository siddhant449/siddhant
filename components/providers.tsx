"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame, LazyMotion, MotionConfig } from "motion/react";
import { useEffect, useRef } from "react";
import { IntroProvider } from "@/lib/intro";

// Motion's animation features arrive in their own chunk after hydration.
const loadFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    // Drive Lenis from Motion's frame loop so scroll-linked values and the
    // smoothed scroll position are always computed in the same frame.
    function update(data: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(data.timestamp);
    }
    frame.update(update, true);
    return () => cancelFrame(update);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        lerp: 0.09,
        wheelMultiplier: 1,
        anchors: { offset: 0 },
        stopInertiaOnNavigate: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <IntroProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </IntroProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
