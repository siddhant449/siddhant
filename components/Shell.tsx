"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { audio, useDirectorValue, type DirectorState } from "@/lib/audio";
import { startKeyLight } from "@/lib/keylight";
import { stage } from "@/lib/stage";
import type { Track } from "@/lib/tracks";
import Gate from "./Gate";
import Nav from "./Nav";
import Player from "./Player";
import SceneRail from "./rail/SceneRail";

function ScrollLock({ locked, smooth }: { locked: boolean; smooth: boolean }) {
  const lenis = useLenis();
  useEffect(() => {
    if (smooth) {
      if (!lenis) return;
      if (locked) lenis.stop();
      else lenis.start();
      return;
    }
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }, [lenis, locked, smooth]);
  return null;
}

/**
 * Everything that outlives a route change: smooth scroll, grain, the gate that unlocks
 * audio, the music director, the key light, the pillar line and the mini player.
 */
const isStarted = (s: DirectorState) => s.started;

export default function Shell({ tracks, children }: { tracks: Track[]; children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  // Only whether the gate is passed: a change of song or sound must not re-render the shell, which
  // would hand Lenis's context a new value and re-render every scene that scrolls with it.
  const started = useDirectorValue(isStarted);
  // The scene rail maps the home page's reel; case studies are their own short films.
  const home = usePathname() === "/";

  useEffect(() => audio.setTracks(tracks), [tracks]);
  useEffect(() => startKeyLight(reduce), [reduce]);

  const enter = (withSound: boolean) => {
    audio.unlock(withSound);
    stage.reveal(reduce);
  };

  const content = (
    <>
      <ScrollLock locked={!started} smooth={!reduce} />
      <div className="grain" aria-hidden />
      <Gate open={started} onEnter={enter} />
      <div className="topfade" aria-hidden />
      {/* While the gate is up, the film behind it is out of reach of focus and assistive tech. */}
      <div className="behind" inert={!started}>
        <Nav />
        {started && home && <SceneRail />}
        {children}
      </div>
      {started && <Player />}
    </>
  );

  // Reduced motion gets native scrolling; everything else gets Lenis.
  if (reduce) return content;
  return (
    <ReactLenis root options={{ lerp: 0.085, anchors: true }}>
      {content}
    </ReactLenis>
  );
}
