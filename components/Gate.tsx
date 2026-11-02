"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { audio, useDirector } from "@/lib/audio";

/** Degrees per second at full spin: fast enough to read as playing, slow enough to keep the print legible. */
const SPIN = 220;
/** How long the record plays on the gate after the click before the film opens, in ms. */
const HOLD = 1100;
const EASE = [0.2, 0.7, 0.2, 1] as const;
const OUT = [0.7, 0, 0.2, 1] as const;

/**
 * The album: the sleeve is a frame of this site's own hero, with a black vinyl inside and the cover's
 * pillar of light running on up the wall above it. The record rests a little out of the sleeve and only
 * comes all the way out while the song is really playing. Hovering plays it where the browser allows
 * sound before a click (after any press on the page, or on sites the visitor often plays media on);
 * where it doesn't, the record slides further out and asks for the click. The click starts the song
 * inside the gesture, holds on the spinning record for a beat, then opens the film.
 */
function Record({ onPlay }: { onPlay: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const [over, setOver] = useState(false);
  const [dropped, setDropped] = useState(false);
  // Once clicked, the disc keeps spinning through the exit.
  const playing = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  // `ready`: the first song is decoded, so the record plays from it the moment it is asked.
  const { tracks, soundOn, cue, ready } = useDirector();
  // The record plays the song scoring the page behind it, so the label names that one.
  const song = tracks.find((t) => t.cue === (cue ?? "S1"));
  const state = dropped || (over && soundOn) ? "playing" : over ? "ready" : "idle";

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (on: boolean) => setOver(on);
  // The pointer or focus on the record plays it, once its song is ready (it may have arrived first).
  useEffect(() => {
    if (!ready) return;
    if (over) audio.preview();
    else if (!playing.current) audio.stopPreview();
  }, [ready, over]);

  const angle = useMotionValue(0);
  const speed = useRef(0);
  useAnimationFrame((_, dt) => {
    if (reduce) return;
    const target = state === "playing" ? SPIN : state === "ready" ? SPIN * 0.1 : 0;
    // Spin up and run down like a real drive, rather than starting or stopping dead.
    speed.current += (target - speed.current) * (1 - Math.exp(-dt / 450));
    if (speed.current > 0.5) angle.set((angle.get() + (speed.current * dt) / 1000) % 360);
  });

  return (
    <motion.div
      className="gate__record"
      data-state={state}
      onPointerEnter={(e) => e.pointerType !== "touch" && show(true)}
      onPointerLeave={() => show(false)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ scale: 1.25, opacity: 0, filter: "blur(10px)", transition: { duration: 1.1, ease: OUT } }}
      transition={{ duration: 1.2, ease: EASE }}
    >
      <span className="gate__beam" aria-hidden />
      <div className="gate__disc" aria-hidden>
        <motion.div className="gate__face" style={{ rotate: angle }}>
          {/* The centre label is the cover art, printed round. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="gate__label" src="/img/album.jpg" alt="" width={900} height={900} />
        </motion.div>
        <span className="gate__shine" />
      </div>
      <button
        type="button"
        className="gate__sleeve gate__cover"
        disabled={!ready}
        onClick={() => {
          if (playing.current) return;
          playing.current = true;
          setDropped(true);
          // Started inside the click, so the browser lets it sound; the film opens a beat later.
          audio.drop();
          timer.current = window.setTimeout(onPlay, reduce ? 0 : HOLD);
        }}
        onFocus={() => show(true)}
        onBlur={() => show(false)}
        aria-label="Play the record and enter the site"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/album.jpg" alt="" width={900} height={900} />
        <span className="gate__sheen" aria-hidden />
      </button>
      <p className="gate__now" aria-hidden>
        {state === "playing" ? (
          <>
            <span className="gate__bars">
              <i />
              <i />
              <i />
              <i />
            </span>
            {song && `${song.title} - ${song.artist}`}
          </>
        ) : (
          <>
            <span className="gate__play" />
            {song && `${song.title} - ${song.artist}`}
          </>
        )}
      </p>
    </motion.div>
  );
}

export default function Gate({ open, onEnter }: { open: boolean; onEnter: (withSound: boolean) => void }) {
  // The record's delayed entry and "Enter without sound" can race; the film opens once.
  const entered = useRef(false);
  const enter = (withSound: boolean) => {
    if (entered.current) return;
    entered.current = true;
    onEnter(withSound);
  };

  return (
    <AnimatePresence>
      {!open && (
        <motion.div
          className="gate"
          // Any press on the gate unlocks sound, so the next hover on the record can play it.
          onPointerDown={() => audio.prime()}
          initial={{ opacity: 1 }}
          // Fading out, it lets the pointer through to the film: the record and its buttons stop reacting.
          exit={{ opacity: 0, pointerEvents: "none", transition: { duration: 1.1, ease: OUT } }}
        >
          <Record onPlay={() => enter(true)} />
          <p className="gate__hint">Click the cover to play &amp; enter</p>
          <button type="button" className="gate__quiet" onClick={() => enter(false)}>
            Enter without sound
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
