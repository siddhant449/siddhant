"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import { useScene } from "@/lib/cues";

/**
 * The case-study page's root. It registers as the "case" scene so the director keeps S2
 * scoring it across the navigation, and it starts the reel at the top. The reset runs in
 * a layout effect, before React checks whether the morphing hero is in the viewport.
 */
export default function CaseScene({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useScene(ref, "case");

  const lenis = useLenis();
  useLayoutEffect(() => {
    // Lenis may still be easing toward the previous page's scroll target; jump past it.
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [lenis]);

  return <main ref={ref}>{children}</main>;
}
