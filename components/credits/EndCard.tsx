"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type RefObject } from "react";
import { useLenis } from "lenis/react";
import { useReducedMotion, type MotionValue } from "motion/react";
import LyricLine from "@/components/cine/LyricLine";
import { audio, useDirector } from "@/lib/audio";
import { person } from "@/lib/content";
import { REEL, SCENES } from "@/lib/cues";
import { useLyricHold } from "@/lib/hold";
import type { Track } from "@/lib/tracks";
import styles from "./EndCard.module.css";

const [USER, DOMAIN] = person.email.split("@");

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Ahmedabad's time ("14:32"), ticking on the minute while anything shows it. */
const ahmedabad = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clock = { now: "", timer: 0, listeners: new Set<() => void>() };
function tick() {
  clock.now = ahmedabad.format(Date.now());
  clock.listeners.forEach((fn) => fn());
  clock.timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20);
}
function subscribeClock(fn: () => void) {
  clock.listeners.add(fn);
  if (clock.listeners.size === 1) tick();
  return () => {
    clock.listeners.delete(fn);
    if (!clock.listeners.size) window.clearTimeout(clock.timer);
  };
}
// The server has no visitor and no time to show: the clock appears once the page is live.
const readClock = () => clock.now || (clock.now = ahmedabad.format(Date.now()));
const serverClock = () => null;

/**
 * The songs, once the shell has handed them to the director. The server renders the tracklist
 * without them, so hydration starts from none too, whenever the shell's effect happened to run.
 */
const NO_TRACKS: Track[] = [];
const readTracks = () => audio.getState().tracks;
const serverTracks = () => NO_TRACKS;

function LocalTime() {
  const time = useSyncExternalStore(subscribeClock, readClock, serverClock);
  return <>{time ? `${time} in Ahmedabad` : "Ahmedabad"}</>;
}

function NowPlaying() {
  const { cue, soundOn } = useDirector();
  const track = audio.track(cue);
  return <>{soundOn && track ? `${track.title}, ${track.artist}` : "Sound off"}</>;
}

/** Copies the address and says so, on screen and to assistive tech. */
function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => {
    const t = timer;
    return () => window.clearTimeout(t.current);
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2400);
  };
  return (
    <>
      <button type="button" className={styles.copy} onClick={copy} data-copied={copied ? "1" : "0"}>
        {/* Both labels share one cell, so the button keeps its width when it changes. */}
        <span aria-hidden={copied}>Copy email</span>
        <span aria-hidden={!copied}>Copied</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

/**
 * The end card, held on black after the iris closes: "So live your life" at its centre, where
 * the page lands and holds while the line is sung. Then the footer scrolls up like end credits
 * and the ask: the email, local time and what is playing, the tracklist (each scene with its
 * song, linking back to it), the links, and the name across the last frame. `progress` runs 0..1
 * from the card's track entering the viewport to the end of its hold.
 */
export default function EndCard({
  trackRef,
  progress,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  progress: MotionValue<number>;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  useLyricHold(frameRef, "liveYourLife");
  const tracks = useSyncExternalStore(audio.subscribe, readTracks, serverTracks);
  const lenis = useLenis();
  const reduce = useReducedMotion() ?? false;
  const askId = useId();
  const reelId = useId();

  // Jumps go through Lenis with `force`, so a lyric hold's glide can never block them, and hand
  // focus to the scene they land on. Instant under reduced motion.
  const go = (to: number | HTMLElement, target: HTMLElement | null, slow = false) => {
    const land = () => {
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };
    if (lenis && !reduce) {
      lenis.scrollTo(to, { duration: slow ? 2 : 1.4, easing: slow ? easeInOut : easeOut, force: true, onComplete: land });
    } else {
      if (typeof to === "number") window.scrollTo({ top: to, behavior: "instant" });
      else to.scrollIntoView({ behavior: "instant" });
      land();
    }
  };
  const onScene = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    e.preventDefault();
    // Lenis's own anchor handling would start a second, unforced scroll.
    e.stopPropagation();
    go(target, target);
  };
  const onRewind = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    go(0, document.getElementById("top"), true);
  };

  return (
    <>
      <div ref={trackRef} className={styles.track} data-endcard>
        {/* The line's frame: where the page lands for it, the card pinned and the iris closed. */}
        <div ref={frameRef} className={styles.frame} aria-hidden />
        <div className={styles.card}>
          <LyricLine lineId="liveYourLife" as="h2" fallback={progress} window={[0.43, 0.6]} className={styles.lyric} />
        </div>
      </div>

      <footer className={styles.footer}>
        <section className={styles.ask} aria-labelledby={askId}>
          <h2 id={askId} className="label">
            <span className="dot" />
            Let&rsquo;s work together
          </h2>
          <p className={`big ${styles.pitch}`}>Building something that should feel like this?</p>
          <div className={styles.mailBox}>
            <a className={styles.mail} href={`mailto:${person.email}`}>
              <span>{USER}</span>
              <span>@{DOMAIN}</span>
            </a>
          </div>
          <div className={styles.actions}>
            <CopyEmail />
            <p className={styles.status}>
              <span className={`dot ${styles.live}`} aria-hidden />
              Available for new projects
            </p>
          </div>
        </section>

        <dl className={styles.slates}>
          <div>
            <dt>Local time</dt>
            <dd className={styles.time}>
              <LocalTime />
            </dd>
          </div>
          <div>
            <dt>Now playing</dt>
            <dd>
              <NowPlaying />
            </dd>
          </div>
        </dl>

        <nav className={styles.reel} aria-labelledby={reelId}>
          <h3 id={reelId} className={`label ${styles.reelHead}`}>
            <span className="dot" />
            Tracklist
          </h3>
          <ol>
            {REEL.map(({ id, href }) => {
              const scene = SCENES[id];
              const song = tracks.find((t) => t.cue === scene.cue);
              return (
                <li key={id}>
                  <a href={href} onClick={(e) => onScene(e, href)}>
                    <span className={styles.role}>
                      <span className={styles.code}>{scene.code}</span> {scene.label}
                      {song && <span className="sr-only">, </span>}
                    </span>
                    {song && (
                      <span className={styles.song}>
                        {song.title}
                        <span className={styles.artist}>, {song.artist}</span>
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={styles.base}>
          <nav className={styles.links} aria-label="Elsewhere">
            <a href={person.github} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
            <a href={person.linkedin} target="_blank" rel="noreferrer">
              LinkedIn ↗
            </a>
            <a href={person.resume} target="_blank" rel="noreferrer">
              Résumé (PDF)
            </a>
            <a href="#top" className={styles.rewind} onClick={onRewind}>
              Back to the opening
            </a>
          </nav>
          <p className={styles.year}>©2026</p>
        </div>

        {/* The last frame: the name, fitted edge to edge (two lines on a phone). */}
        <div className={styles.mark} aria-hidden>
          <p className={styles.wordmark}>
            <span>Siddhant</span> <span>Kotak</span>
          </p>
        </div>
      </footer>
    </>
  );
}
