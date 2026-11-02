"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { audio, useDirector } from "@/lib/audio";

/** Four bars that read straight from the analyser. */
function Bars({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const bars = ref.current?.children;
    if (!bars) return;
    let raf = 0;
    const picks = [3, 14, 28, 44];
    const tick = () => {
      audio.levels();
      for (let i = 0; i < bars.length; i++) {
        const v = playing ? 0.18 + audio.spectrum[picks[i]] * 1.1 : 0.18 + (i % 2) * 0.22;
        (bars[i] as HTMLElement).style.transform = `scaleY(${Math.min(v, 1)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return (
    <span className="bars" ref={ref} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * The only visible trace of the soundtrack: which song is scoring this scene, and one
 * switch for sound. Songs change by themselves as you scroll.
 */
export default function Player() {
  const { cue, soundOn } = useDirector();
  const t = audio.track(cue);
  if (!t) return null;

  return (
    <motion.div
      className="player"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.6, duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="player__bar">
        <button
          type="button"
          className="player__play"
          onClick={() => audio.toggle()}
          // A toggle keeps one name; aria-pressed carries whether sound is on.
          aria-pressed={soundOn}
          aria-label="Sound"
        >
          {soundOn ? (
            <svg viewBox="0 0 12 14" width="11" height="13" aria-hidden>
              <rect x="1" y="1" width="3.4" height="12" fill="currentColor" />
              <rect x="7.6" y="1" width="3.4" height="12" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 14" width="11" height="13" aria-hidden>
              <path d="M1 1 L11 7 L1 13 Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <a className="player__label" href={t.link} target="_blank" rel="noreferrer" aria-live="polite">
          <Bars playing={soundOn} />
          <span>
            {t.title} - {t.artist.split(",")[0]}
          </span>
        </a>
      </div>
    </motion.div>
  );
}
