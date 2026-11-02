"use client";

import { startTransition, useEffect, useState } from "react";
import { LYRICS, type LyricLine } from "./lyrics";
import { loadIntroAudio } from "./introAudio";
import { INTRO_SYNC, SYNC } from "./sync";
import type { CueId, Track } from "./tracks";

export type Levels = { bass: number; mid: number; high: number; energy: number };

export type DirectorState = {
  tracks: Track[];
  /** The cue the current scene asks for, whether or not sound is on. */
  cue: CueId | null;
  soundOn: boolean;
  /** True once the gate has been passed (audio may still be off). */
  started: boolean;
  /** True once the first song is decoded (or can't be, and will play from its <audio> instead). */
  ready: boolean;
};

export type SceneCue = {
  cue: CueId;
  /** How the scene rail describes the edit into this scene. Whatever it says, two songs never sound together. */
  mode: "blend" | "cut";
  /** A lyric the scene arms ahead of its line: the scene's song comes in at the line itself. */
  lyric?: string;
  /** The way out of the song before: "brake" stops the record dead, as the record change shows it. */
  move?: "brake";
  /** From this scene on, Live Your Life's intro (its own source) is fetched and decoded. */
  preload?: "intro";
};

/**
 * A song playing on a deck from its decoded buffer: one source, from `pos` (song time, on the
 * <audio> element's timeline) at context time `at`, to the end of its region (`to`), where the next
 * region's voice takes over on the bar line.
 */
type Voice = {
  src: AudioBufferSourceNode;
  gain: GainNode;
  at: number;
  pos: number;
  to: number;
  /** Context time from which it is silent; Infinity while it plays on. */
  end: number;
  /** A brake, spinback or release shaping its speed from `move.at` (where it was at `move.p0`). */
  move: Move | null;
  /** The voice that follows it at its seam is queued. */
  seamed: boolean;
};

type Move =
  | { kind: "brake"; at: number; p0: number; dur: number }
  | { kind: "spin"; at: number; p0: number; dur: number }
  | { kind: "release"; at: number; p0: number; r0: number };

/**
 * One player channel: its voices (or, as a fallback, an <audio> element) → bass shelf → a dip for
 * a sung tail → high-pass → low-pass → fader, plus an echo send and a level tap.
 */
type Deck = {
  el: HTMLAudioElement;
  low: BiquadFilterNode;
  duck: BiquadFilterNode;
  hp: BiquadFilterNode;
  lp: BiquadFilterNode;
  fader: GainNode;
  send: GainNode;
  tap: AnalyserNode;
  cue: CueId | null;
  /** "buffer": decoded voices on the audio clock. "element": the <audio> fallback (echo cuts only). */
  kind: "buffer" | "element";
  voices: Voice[];
  /** Other sources of the same song: loop-roll slices. */
  extra: { src: AudioBufferSourceNode; end: number }[];
  /** What it plays: a first region, then `cycle` round and round (`ci` next). */
  first: [number, number] | null;
  cycle: [number, number][];
  ci: number;
  /** Element fallback: the region it loops, and the loop it takes up at the next wrap. */
  loop: [number, number] | null;
  then: [number, number] | null;
  /** What its voices play: a song's preview, or Live Your Life's intro (the music video's audio). */
  source: Source | null;
  /** Its fader's level when open: 1, or the intro's lift. */
  level: number;
  /** When (context time) the element's next loop wrap is due, once its dip is planned. */
  wrapAt: number;
};

/** The handover in progress, for the one-song checks in development. */
type Handover = {
  kind: "rise" | "cut" | "brake" | "spin" | "return";
  token: number;
  from: CueId | null;
  to: CueId;
  at: number;
  until: number;
};

type Lyric = {
  id: string;
  /** pending: not planned yet. approaching: a jump toward the line is on its way. armed: in place. */
  state: "pending" | "approaching" | "armed";
  /** Its scene armed it ahead of the line (the J-cut): its song comes in at the line, but it holds nothing yet. */
  cued: boolean;
  /** Counts the line's jumps, so a jump that has been replaced stands down. */
  jump: number;
  /** When (context time) the jump on its way lands, and where in the song. */
  jumpAt?: number;
  jumpTo?: number;
};

/** A decoded source: one of the songs, or Live Your Life's intro. */
type Source = CueId | "intro";
type Decoded = { buf: AudioBuffer; pad: number; ms: number; bytes?: number };

const BINS = 64;
const OPEN = 20000;
const SHUT = 20;
/** −30 dB: a fader at or under this counts as silent. */
const QUIET = 0.0316;
/** A second deck above this is a second song: the watchdog's line. */
const AUDIBLE = 0.01;
/** Time constant for bringing a deck back to neutral: within about 120ms. */
const SETTLE = 0.035;
/**
 * What an <audio> element puts into the graph trails its currentTime by this much (s): measured in
 * Chrome at 22.7ms (jitter 0.7ms). Every position read from an element is corrected by it.
 */
const ELEMENT_LAG = 0.023;
/** How long before it is heard an incoming <audio> deck starts playing (silently), so its first beat isn't clipped. */
const PREROLL = 0.13;
/**
 * How far ahead, at most, an incoming <audio> deck starts silently: an element takes up to ~0.5s to
 * start sounding after play() (a video's longer), so it starts early and is trimmed onto its mark.
 */
const LEAD_IN = 1;
/** The echo bus's feedback while a song is thrown into it. */
const FEEDBACK = 0.42;
/** How far ahead (s) seams are queued on the audio clock: longer than a background tab's 1s timer. */
const LOOKAHEAD = 1.5;
/** The crossfade where one region of a song runs into the next (s): too short to hear, long enough not to click. */
const SEAM = 0.003;
/**
 * How far before a grid line a seam or beat jump crosses (s). Drum hits land up to ~15ms ahead of
 * the fitted grid (the swing of a live-played or quantised-early beat); crossing here, in the last
 * quiet moment of the bar, the hit after the line is the new region's, whole. Both sides move by the
 * same amount, so the meter doesn't.
 */
const LEAD = 0.02;
/** The ramp on any voice starting or stopping (s). */
const EDGE = 0.004;
/** The edges of a loop roll's grains (s). */
const GRAIN = 0.002;
/** The brake: two beats; its speed curve's steepness. */
const BRAKE_BEATS = 2;
const BRAKE_K = 2.6;
const BRAKE_STEPS = 24;

/**
 * The music director. Scenes ask for a cue; the director decides how to get there, the way a DJ
 * would. Lyrics on screen pull their song to the line, so what you read is what you hear. Visuals
 * read `levels()` and `spectrum` every frame.
 *
 * The songs are decoded once and played as sources on the audio clock, so every cut, loop seam,
 * brake, spinback and roll is placed to the sample. A song that can't be decoded plays from an
 * <audio> element instead, and its handovers are the echo cut.
 *
 * One song at a time, always:
 * - Every handover is in order: the outgoing song is silent, and its echo cleared, before the
 *   incoming one is heard. There is no crossfade between songs of any kind.
 * - `start()` is the only way a deck plays, and the other deck is silenced from the moment it is heard.
 * - A watchdog (every 20ms) silences the deck that isn't live if both are ever sounding, and warns in
 *   development.
 * - Each handover takes a token; a newer one cancels the older one's timers, unqueued sources and
 *   ramps, so handovers never stack. A song still playing is resumed, never restarted.
 * - One director per page (see `install`), and leaving the page stops everything.
 */
class AudioDirector {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private delay: DelayNode | null = null;
  /** The echo bus's feedback and its output: open only while a song is thrown into it. */
  private feedback: GainNode | null = null;
  private wet: GainNode | null = null;
  /** What the echo bus really puts out, for the checks. */
  private echoTap: AnalyserNode | null = null;
  private decks: [Deck, Deck] | null = null;
  private live = 0;
  private loopTimer = 0;
  /** Timers; `token` 0 is general, anything else belongs to that handover. */
  private timers: { id: number; token: number }[] = [];
  private token = 0;
  private handover: Handover | null = null;
  /** The deck that was playing when the sound went off, and where, so it carries on when it comes back. */
  private muted: { deck: Deck; pos: number } | null = null;
  private freq = new Uint8Array(1024);
  private stamp = -1;
  private smooth: Levels = { bass: 0, mid: 0, high: 0, energy: 0 };
  /** The lyric currently on screen (or armed ahead of it), and how far its jump has got. */
  private lyric: Lyric | null = null;
  /** True while the record plays from a hover on the gate, before the visitor has chosen to enter. */
  private previewing = false;
  /** The pointer or focus is on the record, so a preview that is still waiting for the browser may start. */
  private wantPreview = false;
  /** Decoded songs, songs on their way, songs that couldn't be decoded. */
  private decoded: Map<Source, Decoded>;
  private loading = new Map<Source, Promise<void>>();
  private failed = new Set<Source>();
  /** A rise waiting for its song to finish decoding (dropped if anything newer happens). */
  private pendingRise: { cue: CueId; token: number } | null = null;
  /** 64 log-spaced bins, 0..1, for the visuals. */
  readonly spectrum = new Float32Array(BINS);
  /** 128 samples of what is playing now, −1..1, for visuals that draw the song itself. */
  readonly waveform = new Float32Array(128);
  private time = new Uint8Array(2048);
  private probe = new Float32Array(512);

  private state: DirectorState;
  private listeners = new Set<() => void>();

  /**
   * `carry`: what a director this one replaces already knew (the songs, the gate passed), and the
   * songs it had decoded. Sound starts off.
   */
  constructor(carry?: Partial<DirectorState>, decoded?: Map<Source, Decoded>) {
    this.decoded = new Map(decoded);
    this.state = { tracks: [], cue: null, started: false, ...carry, soundOn: false, ready: false };
    if (typeof window === "undefined") return;
    window.addEventListener("pagehide", this.onHide);
    if (this.state.tracks.length) this.warm();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;
  private set(patch: Partial<DirectorState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  setTracks(tracks: Track[]) {
    if (this.state.tracks.length) return;
    this.set({ tracks });
    this.warm();
  }

  track(cue: CueId | null) {
    return this.state.tracks.find((t) => t.cue === cue) ?? null;
  }

  /** Called from the gate's click handler, so the AudioContext is allowed to start. */
  unlock(withSound: boolean) {
    if (this.state.started) return;
    const carry = this.previewing;
    this.previewing = false;
    this.wantPreview = false;
    this.set({ started: true });
    this.warm();
    if (!withSound) {
      if (carry) this.setSound(false);
      return;
    }
    if (!this.ensure()) return;
    void this.ctx!.resume();
    this.set({ soundOn: true });
    // A record already playing (or waiting to) from the hover simply carries on; otherwise the needle drops here.
    if (!carry && !this.pendingRise) this.rise(this.state.cue ?? "S1");
  }

  /**
   * Any press on the gate: create and resume the AudioContext inside that gesture, so a later
   * hover on the record is allowed to play.
   */
  prime() {
    if (this.ensure()) void this.ctx!.resume();
  }

  /**
   * Hovering the record: play it if the browser allows sound without a click here (after any
   * earlier press on this page, or on sites the visitor often plays media on). Otherwise it stays
   * silent, and the click that enters starts it.
   */
  preview() {
    if (this.state.started) return;
    this.wantPreview = true;
    if (this.previewing) return;
    if (!this.ensure()) return;
    const ctx = this.ctx!;
    // A resume the browser held back can resolve on any later press, so check the record is still wanted.
    const go = () => {
      if (ctx.state !== "running" || this.state.started || this.previewing || !this.wantPreview) return;
      this.previewing = true;
      const cue = this.state.cue ?? "S1";
      this.set({ soundOn: true, cue });
      this.rise(cue);
    };
    if (ctx.state === "running") go();
    else void ctx.resume().then(go).catch(() => {});
  }

  /** The record was clicked: start it now, inside the click, so the browser lets it sound. */
  drop() {
    this.preview();
  }

  /** The pointer left the record without entering: let the preview fade away. */
  stopPreview() {
    this.wantPreview = false;
    if (!this.previewing || this.state.started || !this.ctx || !this.decks) return;
    this.previewing = false;
    this.pendingRise = null;
    this.clearTimers();
    this.token++;
    const d = this.decks[this.live];
    const now = this.ctx.currentTime;
    hold(d.fader.gain, now);
    d.fader.gain.setTargetAtTime(0, now, 0.15);
    // Stopped once faded, unless the record has started again by then.
    this.later(0.8, () => {
      if (!this.previewing && !this.state.soundOn) this.silence(d);
    });
    this.set({ soundOn: false });
  }

  setSound(on: boolean) {
    if (on) {
      if (!this.ensure() || !this.decks) return;
      void this.ctx!.resume();
      this.set({ soundOn: true });
      const muted = this.muted;
      this.muted = null;
      // The song that was playing carries on from where it stopped; anything else rises in.
      if (muted && muted.deck.cue === this.state.cue && this.track(muted.deck.cue)) this.resume(muted.deck, muted.pos);
      else if (this.state.cue) this.rise(this.state.cue);
      return;
    }
    this.set({ soundOn: false });
    this.clearTimers();
    this.pendingRise = null;
    if (!this.decks || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Whatever was on its way is over: the next sound starts from what was heard.
    this.token++;
    this.handover = null;
    const heard = this.loudest();
    const pos = heard && this.raw(heard);
    this.muted = heard && pos !== null ? { deck: heard, pos } : null;
    for (const d of this.decks) {
      for (const p of params(d)) hold(p, now);
      this.silence(d);
    }
    this.clearEcho(now, now + 0.02);
    if (this.lyric?.state === "approaching") this.lyric.state = "pending";
  }

  toggle() {
    this.setSound(!this.state.soundOn);
  }

  /** A scene became active. Same cue: keep playing. New cue: hand over to it. */
  enterScene(scene: SceneCue) {
    if (scene.preload === "intro") this.prepareIntro();
    // A lyric the last scene armed ahead of its line goes with that scene if the line never came on screen.
    if (this.lyric?.cued && this.lyric.id !== scene.lyric) this.blurLyric(this.lyric.id);
    if (scene.lyric) this.cueLyric(scene.lyric);
    if (this.state.cue === scene.cue) return;
    this.set({ cue: scene.cue });
    if (!this.state.soundOn || !this.decks) return;
    this.goTo(scene.cue, scene.move);
  }

  /**
   * A lyric came on screen: hold its song on the bars that carry the line, and bring the line in
   * on the next beat (a line that starts on its words, straight onto them). If its song isn't
   * playing yet, it comes in at the line as that song arrives.
   */
  focusLyric(id: string) {
    if (!LYRICS[id]) return;
    if (this.lyric?.id === id) {
      if (!this.lyric.cued) return;
      // The line its scene armed is on screen now, so the line holds the song from here.
      this.lyric.cued = false;
      if (this.lyric.state !== "approaching") this.lyric.state = "pending";
      this.applyLyric();
      return;
    }
    this.lyric = { id, state: "pending", cued: false, jump: 0 };
    this.applyLyric();
  }

  /** The J-cut: a scene arms its lyric before the line is on screen, so its song comes in at the line. */
  private cueLyric(id: string) {
    if (this.lyric?.id === id || !LYRICS[id]) return;
    this.lyric = { id, state: "pending", cued: true, jump: 0 };
  }

  /** The lyric left the screen: let its song play on, rejoining its own loop on the bar. */
  blurLyric(id: string) {
    if (this.lyric?.id !== id) return;
    const line = LYRICS[id];
    this.lyric = null;
    if (!this.decks) return;
    // A cut may already have handed the live deck to the next song, which isn't this line's to
    // restore. A jump still on its way sees the lyric is gone and stands down.
    const d = this.decks[this.live];
    if (d.cue !== line.cue) return;
    // Live Your Life's line left behind (scrolling back up from the end card): back to the intro on the bar.
    const other = this.decks[1 - this.live];
    if (line.cue === "S4" && this.state.soundOn && !this.onIntro(d) && this.decoded.has("intro")) {
      // Its song not heard yet (a cut or the brake still bringing it in, or the end card's own cut):
      // the live deck is the one waiting, so the intro comes in on it instead, when the song would have.
      const h = this.handover;
      if (h && h.to === "S4" && h.kind !== "rise" && h.kind !== "return" && this.ctx!.currentTime < h.until) return this.introInstead(d, h);
      return this.toIntro(d, other);
    }
    this.rejoin(d);
  }

  /**
   * Live Your Life's intro, fetched and decoded once the visitor has reached the B-side: only its audio
   * frames, by range requests (lib/introAudio.ts), lined up against its fingerprint. Until it is ready
   * (or if it can't be), the song comes in on its own drop.
   */
  private prepareIntro() {
    const t = this.track("S4");
    if (!t?.intro || this.decoded.has("intro") || this.loading.has("intro") || this.failed.has("intro")) return;
    const t0 = performance.now();
    const job = loadIntroAudio(t.intro.url, t.intro.at - 3, this.ctx?.sampleRate ?? 48000)
      .then(({ buf, t0: first, bytes }) => {
        this.decoded.set("intro", { buf, pad: calibrate(buf, { ...INTRO_SYNC, pad: first }), ms: performance.now() - t0, bytes });
      })
      .catch(() => {
        this.failed.add("intro");
      })
      .finally(() => this.loading.delete("intro"));
    this.loading.set("intro", job);
  }

  /** Gets the next scene's song ready ahead of time, so its cut lands on the beat. */
  prepare(cue: CueId) {
    if (!this.decks || !this.state.soundOn) return;
    void this.decode(cue);
    if (this.decoded.has(cue)) return;
    const idle = this.decks[1 - this.live];
    // Not a deck still fading out of a cut: loading it now would cut its tail.
    const now = this.ctx!.currentTime;
    if (!idle.el.paused || idle.voices.some((v) => v.end > now) || idle.cue === cue || this.decks[this.live].cue === cue) return;
    this.load(idle, cue);
  }

  /** Position inside the preview of the deck currently playing `cue`, or null if it isn't sounding. */
  trackTime(cue: CueId): number | null {
    if (!this.state.soundOn || !this.decks) return null;
    const d = this.decks[this.live];
    if (d.cue !== cue) return null;
    return this.pos(d);
  }

  levels(): Levels {
    const now = performance.now();
    if (now - this.stamp < 4) return this.smooth;
    const dt = this.stamp < 0 ? 16 : Math.min(now - this.stamp, 100);
    this.stamp = now;

    let bass = 0, mid = 0, high = 0;
    const a = this.analyser;
    if (a && this.state.soundOn) {
      a.getByteFrequencyData(this.freq);
      const f = this.freq;
      const hz = this.ctx!.sampleRate / 2 / f.length;
      const band = (lo: number, hi: number) => {
        const s = Math.floor(lo / hz), e = Math.max(s + 1, Math.floor(hi / hz));
        let sum = 0;
        for (let i = s; i < e; i++) sum += f[i];
        return sum / (e - s) / 255;
      };
      bass = band(30, 160);
      mid = band(400, 2400);
      high = band(5000, 12000);
      for (let i = 0; i < BINS; i++) {
        const lo = 40 * Math.pow(14000 / 40, i / BINS);
        const hi = 40 * Math.pow(14000 / 40, (i + 1) / BINS);
        this.spectrum[i] = band(lo, hi);
      }
      // The waveform, decimated from the analyser's window (its fftSize) to 128 points.
      if (this.time.length !== a.fftSize) this.time = new Uint8Array(a.fftSize);
      a.getByteTimeDomainData(this.time);
      const step = this.time.length / this.waveform.length;
      for (let i = 0; i < this.waveform.length; i++) this.waveform[i] = (this.time[Math.floor(i * step)] - 128) / 128;
    } else {
      this.spectrum.fill(0);
      this.waveform.fill(0);
    }
    // Fast attack (~80ms), slow release (~300ms): pulses read as light, never as strobe.
    const follow = (cur: number, target: number) => {
      const tau = target > cur ? 80 : 300;
      return cur + (target - cur) * (1 - Math.exp(-dt / tau));
    };
    const s = this.smooth;
    s.bass = follow(s.bass, bass);
    s.mid = follow(s.mid, mid);
    s.high = follow(s.high, high);
    s.energy = s.bass * 0.5 + s.mid * 0.35 + s.high * 0.15;
    return s;
  }

  /** Deck snapshot for verification in development: each deck's song, where it is, and what it really outputs. */
  debug() {
    const now = this.ctx?.currentTime ?? 0;
    return {
      live: this.live,
      lyric: this.lyric,
      ctx: this.ctx?.currentTime ?? null,
      handover: this.handover,
      echo: this.wet && this.feedback ? { wet: +this.wet.gain.value.toFixed(3), feedback: +this.feedback.gain.value.toFixed(3), rms: this.echoTap ? +this.rmsOf(this.echoTap).toFixed(4) : 0 } : null,
      decoded: Object.fromEntries([...this.decoded].map(([c, d]) => [c, { ms: Math.round(d.ms), pad: +(d.pad * 1000).toFixed(2), mb: +((d.buf.length * d.buf.numberOfChannels * 4) / 1e6).toFixed(1), fetchedKB: d.bytes ? Math.round(d.bytes / 1000) : undefined }])),
      decks: this.decks?.map((d) => {
        const t = this.pos(d);
        return {
          cue: d.cue,
          kind: this.onIntro(d) ? "intro" : d.kind,
          paused: !this.playing(d, now),
          time: t === null ? null : +t.toFixed(3),
          gain: +this.gainOf(d, now).toFixed(3),
          rms: +this.rms(d).toFixed(4),
          voices: d.voices.length,
          // voices sounding now (2 only inside a seam's few ms; more than that would be two sources at once)
          heard: d.voices.filter((v) => v.at <= now && now < v.end && v.gain.gain.value > 0.01).length,
          send: +d.send.gain.value.toFixed(3),
          hp: Math.round(d.hp.frequency.value),
          lp: Math.round(d.lp.frequency.value),
          move: d.voices.find((v) => v.move && now >= v.move.at)?.move?.kind ?? null,
          loop: d.kind === "element" ? d.loop : d.cycle,
        };
      }),
    };
  }

  /** What a director replacing this one should know: the songs, and whether the gate is passed. */
  handOff(): Partial<DirectorState> {
    return { tracks: this.state.tracks, cue: this.state.cue, started: this.state.started };
  }

  /** The sources this director has decoded, so one replacing it needn't decode them again. */
  songs() {
    return this.decoded;
  }

  /** Stops and lets go of everything, for good: a newer director (after a hot reload) has the page. */
  dispose() {
    window.removeEventListener("pagehide", this.onHide);
    this.clearTimers();
    window.clearInterval(this.loopTimer);
    this.token++;
    this.pendingRise = null;
    for (const d of this.decks ?? []) {
      for (const v of d.voices) stopNow(v.src);
      for (const x of d.extra) stopNow(x.src);
      d.voices = [];
      d.extra = [];
      d.el.pause();
      d.el.removeAttribute("src");
      d.el.load();
    }
    this.decks = null;
    this.analyser?.disconnect();
    this.analyser = null;
    void this.ctx?.close().catch(() => {});
    this.listeners.clear();
  }

  // ---------------------------------------------------------------- internals

  /** Leaving the page (a refresh, or into the back-forward cache): everything stops until asked again. */
  private onHide = () => {
    this.wantPreview = false;
    this.previewing = false;
    if (this.decks) this.setSound(false);
  };

  /** Decodes the first song now (the gate plays it), and the others in idle time once the gate is passed. */
  private warm() {
    if (typeof window === "undefined" || !this.state.tracks.length) return;
    const first = this.decode("S1");
    if (first) void first.then(() => this.set({ ready: true }));
    else this.set({ ready: true });
    if (!this.state.started) return;
    const idle = (fn: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(fn, { timeout: 2000 }) : window.setTimeout(fn, 300);
    idle(() => void this.decode("S2")?.then(() => idle(() => void this.decode("S4"))));
  }

  /**
   * Fetches and decodes a song once, and lines its decode up with the element timeline (a browser's
   * decoder trims its own amount of priming). A song that fails stays on its <audio> element.
   */
  private decode(cue: CueId): Promise<void> | undefined {
    if (this.decoded.has(cue) || this.failed.has(cue)) return Promise.resolve();
    const pending = this.loading.get(cue);
    if (pending) return pending;
    const t = this.track(cue);
    const Offline =
      typeof window !== "undefined"
        ? (window.OfflineAudioContext ??
          (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext)
        : undefined;
    if (!t || !Offline) {
      this.failed.add(cue);
      return undefined;
    }
    const t0 = performance.now();
    const job = (async () => {
      try {
        // A stalled download gives up after 10s; the song then plays from its <audio> element.
        const signal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(10000) : undefined;
        const res = await fetch(t.preview, { mode: "cors", signal });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.arrayBuffer();
        const buf = await new Offline(2, 1, this.ctx?.sampleRate ?? 48000).decodeAudioData(data);
        this.decoded.set(cue, { buf, pad: calibrate(buf, SYNC[cue]), ms: performance.now() - t0 });
      } catch {
        this.failed.add(cue);
      } finally {
        this.loading.delete(cue);
      }
      const p = this.pendingRise;
      if (p?.cue === cue && p.token === this.token) this.rise(cue);
    })();
    this.loading.set(cue, job);
    return job;
  }

  /** Creates the audio graph once. False where the browser has no Web Audio: the site then runs silent. */
  private ensure(): boolean {
    if (this.ctx) return true;
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;
    let ctx: AudioContext;
    try {
      ctx = new Ctx();
    } catch {
      return false;
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;
    analyser.connect(ctx.destination);

    // Shared echo bus: a darkened feedback delay the outgoing song is thrown into. Closed (no
    // feedback, no output) except during a throw, so no echo ever rings into the next song.
    const delay = ctx.createDelay(2);
    const feedback = ctx.createGain();
    feedback.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200;
    const wet = ctx.createGain();
    wet.gain.value = 0;
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(wet);
    wet.connect(analyser);
    const echoTap = ctx.createAnalyser();
    echoTap.fftSize = 512;
    wet.connect(echoTap);

    const makeDeck = (): Deck => {
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      const low = ctx.createBiquadFilter();
      low.type = "lowshelf";
      low.frequency.value = 180;
      const duck = ctx.createBiquadFilter();
      // A wide scoop of the vocal's band: on the separated stems it takes 9dB off a sung vowel and
      // 0.5dB off the drums, so the downbeat keeps its punch.
      duck.type = "peaking";
      duck.frequency.value = 1200;
      duck.Q.value = 0.35;
      duck.gain.value = 0;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = SHUT;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = OPEN;
      lp.Q.value = 0.9;
      const fader = ctx.createGain();
      fader.gain.value = 0;
      const send = ctx.createGain();
      send.gain.value = 0;
      const tap = ctx.createAnalyser();
      tap.fftSize = 512;
      ctx.createMediaElementSource(el).connect(low);
      low.connect(duck);
      duck.connect(hp);
      hp.connect(lp);
      lp.connect(fader);
      fader.connect(analyser);
      fader.connect(tap);
      lp.connect(send);
      send.connect(delay);
      const deck: Deck = {
        el, low, duck, hp, lp, fader, send, tap,
        cue: null, kind: "element", voices: [], extra: [], first: null, cycle: [], ci: 0, loop: null, then: null,
        source: null, level: 1, wrapAt: 0,
      };
      // A preview that runs out before its loop point restarts at the loop start.
      el.addEventListener("ended", () => {
        if (deck.kind === "element" && deck.loop && this.state.soundOn && this.decks?.[this.live] === deck) {
          el.currentTime = deck.loop[0];
          this.wrapped(deck);
          this.start(deck);
        }
      });
      return deck;
    };

    this.ctx = ctx;
    this.analyser = analyser;
    this.delay = delay;
    this.feedback = feedback;
    this.wet = wet;
    this.echoTap = echoTap;
    this.freq = new Uint8Array(analyser.frequencyBinCount);
    this.decks = [makeDeck(), makeDeck()];
    this.loopTimer = window.setInterval(() => this.tick(), 20);
    // iOS: play as music, so the ringer's silent switch doesn't mute the site.
    try {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "playback";
    } catch {}
    // A call or a locked phone suspends the context: sound is then off, as the player says, until asked for again.
    ctx.addEventListener("statechange", () => {
      if (this.ctx !== ctx || ctx.state === "running" || ctx.state === "closed") return;
      if (this.state.started && this.state.soundOn) this.setSound(false);
    });
    return true;
  }

  /**
   * Every 20ms: queue the seams coming up (each placed exactly on the audio clock), let go of voices
   * that have finished, wrap <audio> loops, and the one-song watchdog. Two decks sounding at once
   * can't happen by design; if it ever does, the one that isn't live is silenced.
   */
  private tick() {
    const decks = this.decks;
    const ctx = this.ctx;
    if (!decks || !ctx) return;
    const now = ctx.currentTime;
    for (const d of decks) {
      if (d.kind === "element") {
        if (d.loop && !d.el.paused && d.fader.gain.value > AUDIBLE && (this.handover?.until ?? 0) < now) {
          const left = d.loop[1] - d.el.currentTime;
          // Its wrap is a seek, which an element can't place exactly: a 60ms dip on the audio clock hides it.
          if (left > 0 && left < 0.25 && d.wrapAt < now) {
            const at = now + left + ELEMENT_LAG;
            d.wrapAt = at + 0.1;
            const g = d.fader.gain;
            holdAt(g, at - 0.012, d.level);
            g.linearRampToValueAtTime(0, at - 0.004);
            g.setValueAtTime(0, at + 0.05);
            g.linearRampToValueAtTime(d.level, at + 0.065);
          }
        }
        if (d.loop && !d.el.paused && d.el.currentTime >= d.loop[1]) {
          d.el.currentTime = d.loop[0];
          this.wrapped(d);
        }
        continue;
      }
      this.seams(d, now + LOOKAHEAD);
      d.voices = d.voices.filter((v) => {
        if (v.end >= now - 0.1) return true;
        stopNow(v.src);
        return false;
      });
      d.extra = d.extra.filter((x) => x.end >= now - 0.1);
    }
    const [a, b] = decks;
    if (this.gainOf(a, now) > AUDIBLE && this.gainOf(b, now) > AUDIBLE) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[audio] two decks were playing at once; silencing the one that isn't live", this.debug().decks);
      }
      this.silence(decks[1 - this.live]);
    }
  }

  /** After a wrap, a deck rejoining its song's loop takes it up. */
  private wrapped(d: Deck) {
    if (!d.then) return;
    d.loop = d.then;
    d.then = null;
  }

  /**
   * The only way a deck starts playing. The other deck is silenced from the moment this one is heard
   * (at once for <audio>, which can only start now; at `at` on the audio clock for a decoded song).
   */
  private start(d: Deck, at?: number, pos?: number, fade = EDGE) {
    const other = d === this.decks![0] ? this.decks![1] : this.decks![0];
    const now = this.ctx!.currentTime;
    if (d.kind === "element" || pos === undefined) {
      // An element starts now, playing silently (its fader closed) until it is heard at `at`.
      this.silence(other, Math.max(now, at ?? now));
      void d.el.play().catch(() => {});
      return null;
    }
    if (at === undefined) return null;
    this.silence(other, Math.max(now, at));
    return this.voice(d, at, pos, fade);
  }

  /**
   * A deck stopped dead from `at` (now by default): its fader and echo send at 0, every voice faded
   * out and unqueued, its <audio> paused.
   */
  private silence(d: Deck, at?: number) {
    const now = this.ctx!.currentTime;
    const t = Math.max(now + EDGE, at ?? now);
    for (const p of [d.fader.gain, d.send.gain]) fadeOut(p, t, EDGE);
    if (t <= now + 0.02) d.el.pause();
    else this.later(t - now, () => this.decks?.[this.live] !== d && d.el.pause());
    for (const v of d.voices) {
      if (v.end <= t) continue;
      if (v.at >= t) {
        stopNow(v.src);
        v.end = v.at;
        continue;
      }
      fadeOut(v.gain.gain, t, EDGE);
      v.end = t + EDGE;
      v.seamed = true;
    }
    for (const x of d.extra) {
      if (x.end > t) stopAt(x.src, t + EDGE);
      x.end = Math.min(x.end, t + EDGE);
    }
  }

  /** The echo bus opened for a throw, from now. */
  private openEcho(now: number) {
    for (const [p, v] of [
      [this.feedback!.gain, FEEDBACK],
      [this.wet!.gain, 1],
    ] as const) {
      p.cancelScheduledValues(now);
      p.setValueAtTime(v, now);
    }
  }

  /** The echo bus cleared: its feedback killed and its output faded to nothing between `from` and `to`. */
  private clearEcho(from: number, to: number) {
    for (const [p, v] of [
      [this.feedback!.gain, FEEDBACK],
      [this.wet!.gain, 1],
    ] as const) {
      holdAt(p, from, v);
      p.linearRampToValueAtTime(0, to);
    }
  }

  /**
   * Puts a cue on a deck: its decoded song if it has one, otherwise its <audio> element starts loading
   * it. `intro`: Live Your Life's intro instead (decoded, or not at all).
   */
  private load(deck: Deck, cue: CueId, intro = false) {
    const t = this.track(cue);
    if (!t) return null;
    const was = deck.kind;
    deck.cue = cue;
    if (intro && t.intro && this.decoded.has("intro")) {
      deck.kind = "buffer";
      deck.source = "intro";
      deck.level = Math.pow(10, t.intro.gain / 20);
    } else {
      deck.level = 1;
      deck.source = cue;
      deck.kind = this.decoded.has(cue) ? "buffer" : "element";
      if (deck.kind === "element" && (deck.cue !== cue || !deck.el.src || !deck.el.src.includes(t.preview.slice(-30)))) deck.el.src = t.preview;
    }
    // Switching between its <audio> and decoded voices, the deck lets go of the other first, so nothing
    // it had going carries on under the new song through the same fader.
    if (was === "element" && deck.kind === "buffer") deck.el.pause();
    if (was === "buffer" && deck.kind === "element" && this.ctx) this.clear(deck, this.ctx.currentTime);
    return t;
  }

  /** Everything a deck still had sounding or queued, cut now (a 4ms fade): its voices, its extras, its <audio>. */
  private clear(d: Deck, now: number) {
    const t = now + EDGE;
    for (const v of d.voices) {
      if (v.end <= now) continue;
      if (v.at >= t) {
        stopNow(v.src);
        v.end = v.at;
        continue;
      }
      fadeOut(v.gain.gain, t, EDGE);
      stopAt(v.src, t);
      v.end = t;
      v.seamed = true;
    }
    for (const x of d.extra) {
      if (x.end > now) stopAt(x.src, t);
      x.end = Math.min(x.end, t);
    }
    d.el.pause();
  }

  /** True while a deck plays Live Your Life's intro. */
  private onIntro(d: Deck) {
    return d.source === "intro";
  }

  /** How far a deck's own timeline sits from its song's grid: the intro's shift, or 0. */
  private shift(d: Deck) {
    return this.onIntro(d) ? (this.track("S4")?.intro?.shift ?? 0) : 0;
  }

  // -------------------------------------------------------------- voices: decoded songs on the audio clock

  /** A voice of the deck's song from `pos` at context time `at`, fading in over `fade`. */
  private voice(d: Deck, at: number, pos: number, fade: number) {
    const ctx = this.ctx!;
    const song = this.decoded.get(d.source!)!;
    const now = ctx.currentTime;
    const when = Math.max(at, now);
    const offset = pos + (when - at) - song.pad;
    const src = ctx.createBufferSource();
    src.buffer = song.buf;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(d.low);
    // Before the decode's first sample (never, in practice): wait for it.
    src.start(when + Math.max(0, -offset), Math.max(0, offset));
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(1, when + fade);
    const v: Voice = { src, gain, at, pos, to: this.regionEnd(d, pos), end: Infinity, move: null, seamed: false };
    d.ci = this.nextIndex(d, pos);
    d.voices.push(v);
    this.tail(d, at, pos);
    return v;
  }

  /**
   * Queues the seams due before `until`: each region runs into the next on its bar line. The
   * crossfade (SEAM) ends on the line, both voices still in the last moments of their bars, so the
   * downbeat that follows is the new region's alone, never two attacks summed. All on the audio clock.
   */
  private seams(d: Deck, until: number) {
    if (d.kind !== "buffer" || !d.cycle.length) return;
    for (let n = 0; n < 6; n++) {
      const v = d.voices[d.voices.length - 1];
      if (!v || v.move || v.seamed || v.end !== Infinity) return;
      const at = v.at + (v.to - v.pos) - LEAD;
      if (at > until) return;
      const [a] = d.cycle[d.ci % d.cycle.length];
      v.seamed = true;
      v.end = at;
      v.gain.gain.setValueAtTime(1, at - SEAM);
      v.gain.gain.linearRampToValueAtTime(0, at);
      this.voice(d, at - SEAM, a - LEAD - SEAM, SEAM);
    }
  }

  /** Where a region a voice at `pos` plays in ends: its own region's end, or the next one's, or the next bar line. */
  private regionEnd(d: Deck, pos: number) {
    const all = [...(d.first ? [d.first] : []), ...d.cycle];
    const inside = all.find(([a, b]) => pos >= a - 0.03 && pos < b - 0.03);
    if (inside) return inside[1];
    const after = all.filter(([a]) => a > pos).sort((x, y) => x[0] - y[0])[0];
    if (after) return after[1];
    const t = this.track(d.cue)!;
    const shift = this.shift(d);
    return gridAfter(t, pos + shift, 4, 0.05) - shift;
  }

  /** Which region of the cycle comes after the one a voice at `pos` plays in. */
  private nextIndex(d: Deck, pos: number) {
    const n = d.cycle.length;
    if (!n) return 0;
    const at = (i: number) => (i + 1) % n;
    const inside = d.cycle.findIndex(([a, b]) => pos >= a - 0.03 && pos < b - 0.03);
    if (inside >= 0) return at(inside);
    if (d.first && pos >= d.first[0] - 0.03 && pos < d.first[1] - 0.03) return 0;
    const after = d.cycle.map(([a], i) => [a, i] as const).filter(([a]) => a > pos).sort((x, y) => x[0] - y[0])[0];
    if (after && !(d.first && d.first[0] > pos && d.first[0] < after[0])) return at(after[1]);
    return 0;
  }

  /** A sung vowel ringing over from the line before a downbeat the song comes in on: scooped out of the mids for 0.2s. */
  private tail(d: Deck, at: number, pos: number) {
    const t = this.track(d.cue);
    if (!t?.tails?.some((x) => Math.abs(x - pos) < 0.03)) return;
    const g = d.duck.gain;
    const when = Math.max(at, this.ctx!.currentTime);
    g.cancelScheduledValues(when);
    g.setValueAtTime(0, when);
    g.linearRampToValueAtTime(-18, when + 0.015);
    g.setValueAtTime(-18, when + 0.17);
    g.linearRampToValueAtTime(0, when + 0.26);
  }

  /** The voice sounding (or due) at context time `t`. */
  private voiceAt(d: Deck, t: number) {
    for (let i = d.voices.length - 1; i >= 0; i--) if (d.voices[i].at <= t + 1e-4) return d.voices[i];
    return d.voices[0] ?? null;
  }

  /** Where in the song a voice is at context time `t`, through any brake, spinback or release. */
  private posOf(v: Voice, t: number) {
    const m = v.move;
    if (!m || t <= m.at) return v.pos + (t - v.at);
    const u = t - m.at;
    if (m.kind === "brake") return m.p0 + brakeTravel(Math.min(u, m.dur), m.dur);
    if (m.kind === "spin") return m.p0 - spinTravel(Math.min(u, m.dur), m.dur);
    return m.p0 + u - (1 - m.r0) * RELEASE * (1 - Math.exp(-u / RELEASE));
  }

  /** Song time of a deck now, or null if it isn't sounding. */
  private pos(d: Deck, at?: number): number | null {
    if (!this.ctx) return null;
    const p = this.raw(d, at);
    return p === null ? null : p + this.shift(d);
  }

  /** A deck's position on its own source's timeline now (or at the clock time `at`), or null if it isn't sounding. */
  private raw(d: Deck, at?: number): number | null {
    if (!this.ctx) return null;
    if (d.kind === "element") return d.el.paused ? null : d.el.currentTime - ELEMENT_LAG;
    const now = at ?? this.ctx.currentTime;
    const v = this.voiceAt(d, now);
    if (!v || v.at > now || now >= v.end) return null;
    return this.posOf(v, now);
  }

  /** True while a deck is playing or has a voice queued to. */
  private playing(d: Deck, t: number) {
    if (d.kind === "element") return !d.el.paused;
    return d.voices.some((v) => v.end > t) || d.extra.some((x) => x.end > t);
  }

  /** How loud a deck is right now: its fader times its loudest sounding voice (an <audio> deck: its fader). */
  private gainOf(d: Deck, t: number) {
    if (d.kind === "element") return d.el.paused ? 0 : d.fader.gain.value;
    let v = 0;
    for (const x of d.voices) if (x.at <= t && x.end > t) v = Math.max(v, x.gain.gain.value);
    if (d.extra.some((x) => x.end > t)) v = Math.max(v, 1);
    return v * d.fader.gain.value;
  }

  /** What a deck really puts out (the root-mean-square level of its fader's output), for the checks. */
  private rms(d: Deck) {
    return this.rmsOf(d.tap);
  }

  private rmsOf(tap: AnalyserNode) {
    if (this.probe.length !== tap.fftSize) this.probe = new Float32Array(tap.fftSize);
    tap.getFloatTimeDomainData(this.probe);
    let s = 0;
    for (const x of this.probe) s += x * x;
    return Math.sqrt(s / this.probe.length);
  }

  /** Unqueues every voice of a deck that would start after `t`. */
  private dropAfter(d: Deck, t: number) {
    d.voices = d.voices.filter((v) => {
      if (v.at <= t + 1e-4) return true;
      stopNow(v.src);
      return false;
    });
    const last = d.voices[d.voices.length - 1];
    if (last && last.seamed && !last.move && last.end > t) {
      // Its seam went with the voice that followed it: it plays on, and takes the next seam afresh.
      last.gain.gain.cancelScheduledValues(t);
      last.gain.gain.setValueAtTime(1, t);
      last.end = Infinity;
      last.seamed = false;
    }
  }

  /**
   * What a deck plays from here: a first region, then a cycle. The voice heard now takes it up at its
   * own region's end (unless its seam is already under way, when it applies from the region after).
   */
  private program(d: Deck, first: [number, number] | null, cycle: [number, number][]) {
    d.first = first;
    d.cycle = cycle;
    if (d.kind === "element") {
      // An element plays one region at a time: the first, then (when the cycle is a single region) that.
      d.loop = first ?? cycle[0] ?? null;
      d.then = first && cycle.length === 1 ? cycle[0] : null;
      return;
    }
    const now = this.ctx!.currentTime;
    const v = this.voiceAt(d, now);
    if (!v || v.move || v.at > now || now >= v.end) return;
    const next = d.voices[d.voices.indexOf(v) + 1];
    if (next && next.at <= now + 0.02) return;
    if (next) this.dropAfter(d, now + 0.02);
    const p = this.posOf(v, now);
    v.to = this.regionEnd(d, p);
    d.ci = this.nextIndex(d, p);
  }

  /** The song's own program: its loop, then its cycle. */
  private own(t: Track): { first: [number, number]; cycle: [number, number][] } {
    return { first: t.loop, cycle: t.cycle ?? [t.loop] };
  }

  /** A beat jump: from the beat line `at` the song carries on from `target` (crossfaded just before it), with a new program. */
  private jumpTo(d: Deck, line: number, target: number, first: [number, number] | null, cycle: [number, number][]) {
    const at = line - LEAD;
    this.seams(d, at);
    const v = this.voiceAt(d, at);
    this.dropAfter(d, at);
    if (v) {
      v.gain.gain.cancelScheduledValues(at - SEAM);
      v.gain.gain.setValueAtTime(1, at - SEAM);
      v.gain.gain.linearRampToValueAtTime(0, at);
      v.end = at;
      v.seamed = true;
    }
    d.first = first;
    d.cycle = cycle;
    this.voice(d, at - SEAM, target - LEAD - SEAM, SEAM);
  }

  // -------------------------------------------------------------- lyric plumbing shared by both engines

  /**
   * Where a song comes in after a cut, and what it plays: at the line that is waiting for it
   * (holding the line's bars once the line is on screen), otherwise on its drop.
   */
  private entry(cue: CueId, d?: Deck) {
    const t = this.track(cue)!;
    if (d && this.onIntro(d) && t.intro) return { at: t.intro.at, first: t.intro.first, cycle: [t.intro.loop] };
    const line = this.lyricFor(cue);
    if (line) return this.lyric!.cued ? { at: line.approach, ...this.own(t) } : { at: line.approach, first: null, cycle: [line.hold] };
    return { at: t.drop, ...this.own(t) };
  }

  private lyricFor(cue: CueId): LyricLine | null {
    const line = this.lyric ? LYRICS[this.lyric.id] : null;
    return line && line.cue === cue ? line : null;
  }

  /** Every node back to neutral, from now. */
  private reset(d: Deck, now: number) {
    for (const [param, value] of [
      [d.low.gain, 0],
      [d.duck.gain, 0],
      [d.hp.frequency, SHUT],
      [d.lp.frequency, OPEN],
      [d.send.gain, 0],
    ] as const) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(value, now);
    }
    d.el.playbackRate = 1;
  }

  /** The deck heard now: the one playing loudest, if any is above −30 dB. */
  private loudest() {
    const now = this.ctx?.currentTime ?? 0;
    let best: Deck | null = null;
    for (const d of this.decks ?? []) {
      const g = this.gainOf(d, now);
      if (g <= QUIET) continue;
      if (!best || g > this.gainOf(best, now)) best = d;
    }
    return best;
  }

  /**
   * A new handover: takes the next token, cancels the older handover's timers and the sources it had
   * queued but not yet started, and freezes every ramp on both decks and the echo bus where it is, so
   * the new one ramps on from there. A line's plan that the handover interrupts is made afresh.
   */
  private begin(now: number, sameSong: boolean) {
    const token = ++this.token;
    this.pendingRise = null;
    this.timers = this.timers.filter((t) => {
      if (!t.token) return true;
      clearTimeout(t.id);
      return false;
    });
    for (const d of this.decks!) {
      for (const p of params(d)) hold(p, now);
      if (d.kind === "buffer") this.dropAfter(d, now + 0.01);
    }
    hold(this.feedback!.gain, now);
    hold(this.wet!.gain, now);
    // Lyric state follows the song: a new song means a new plan.
    const lyric = this.lyric;
    if (lyric && (!sameSong || lyric.state === "approaching")) lyric.state = "pending";
    return token;
  }

  /** Hands the score over to `cue`, from whatever is playing now. */
  private goTo(cue: CueId, move?: "brake") {
    const decks = this.decks!;
    const now = this.ctx!.currentTime;
    // Going back to a song that is still sounding: it carries on from where it is, never restarted.
    const keep = decks.find((d) => d.cue === cue && this.raw(d) !== null && this.gainOf(d, now) > AUDIBLE);
    if (keep) return this.resume(keep);
    const out = this.loudest();
    if (!out || !this.track(out.cue)) return this.rise(cue);
    if (!this.track(cue)) return;
    const token = this.begin(now, false);
    const inn = out === decks[0] ? decks[1] : decks[0];
    this.live = decks.indexOf(inn);
    // Only one deck plays: the other is silent, and takes the new song now, so it is loaded in time.
    // Live Your Life comes in on its intro when the intro is ready and no line is waiting for the song.
    this.silence(inn);
    this.load(inn, cue, cue === "S4" && !this.lyricFor(cue));
    this.reset(inn, now);
    if (out.kind === "buffer") {
      const v = this.voiceAt(out, now);
      const m = v?.move;
      // Already braking or spinning out (a scroll back and forth): let it finish, silent by its end, and come in after it.
      if (m && m.kind !== "release" && now < m.at + m.dur) {
        const end = m.at + m.dur;
        glide(out.fader.gain, out.fader.gain.value, 0, now, Math.max(0.03, end - now));
        return this.after(out, inn, cue, token, now, end, m.kind, m.at);
      }
      if (out.cue === "S2" && cue === "S4" && move === "brake") return this.brakeOut(out, inn, cue, token, now);
      if (out.cue === "S4") return this.spinOut(out, inn, cue, token, now);
    }
    this.cut(out, inn, cue, token, now);
  }

  /** First sound, or sound switched on: the song rises out of a closed filter, out of the mist. */
  private rise(cue: CueId) {
    if (!this.decks || !this.ctx) return;
    // Its song still decoding (the gate's first moments): it rises as soon as it is ready.
    // Taking a token of its own, so the handover it interrupts can't still bring its song in meanwhile.
    if (!this.decoded.has(cue) && this.loading.has(cue)) {
      const token = this.begin(this.ctx.currentTime, false);
      this.silence(this.decks[this.live]);
      this.pendingRise = { cue, token };
      return;
    }
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const token = this.begin(now, false);
    const d = this.decks[this.live];
    // Whatever this deck still had going (a preview fading out, a voice left from an earlier song) stops here.
    this.clear(d, now);
    const t = this.load(d, cue);
    if (!t) return;
    const line = this.lyricFor(cue);
    const at = line ? line.approach : t.startAt;
    if (line && !this.lyric!.cued) this.program(d, null, [line.hold]);
    else this.program(d, this.own(t).first, this.own(t).cycle);
    this.reset(d, now);
    this.clearEcho(now, now + 0.03);
    const bar = 240 / t.bpm;
    d.lp.frequency.setValueAtTime(350, now);
    d.lp.frequency.exponentialRampToValueAtTime(OPEN, now + bar * 2);
    d.fader.gain.setValueAtTime(0, now);
    d.fader.gain.linearRampToValueAtTime(d.level, now + 1.2);
    if (d.kind === "buffer") this.start(d, now + 0.01, at);
    else {
      d.el.currentTime = at;
      this.start(d);
    }
    this.handover = { kind: "rise", token, from: null, to: cue, at: now, until: now + 1.2 };
    // A lyric that came on screen before the song started gets its jump now.
    this.step(0.05, () => this.applyLyric());
  }

  /**
   * Back to the song that is still playing: a handover on its way is called off, the song carries
   * on from where it is (back to neutral within about 120ms; a record braking spins back up to
   * speed), and a throw that had begun dies away. `from`: start it again there after a mute.
   */
  private resume(d: Deck, from?: number) {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const token = this.begin(now, true);
    this.live = this.decks!.indexOf(d);
    for (const [p, v] of [
      [d.fader.gain, d.level],
      [d.low.gain, 0],
      [d.duck.gain, 0],
      [d.hp.frequency, SHUT],
      [d.lp.frequency, OPEN],
      [d.send.gain, 0],
    ] as const) {
      p.setTargetAtTime(v, now, SETTLE);
    }
    d.el.playbackRate = 1;
    this.clearEcho(now, now + 0.12);
    if (from !== undefined) {
      if (d.kind === "buffer") this.start(d, now + 0.01, from, 0.02);
      else {
        d.el.currentTime = from + ELEMENT_LAG;
        this.start(d);
      }
    } else {
      this.silence(d === this.decks![0] ? this.decks![1] : this.decks![0]);
      if (d.kind === "buffer") this.release(d, now);
    }
    this.handover = { kind: "return", token, from: null, to: d.cue!, at: now, until: now + 0.15 };
    this.step(0.15, () => this.applyLyric());
  }

  /** A record caught mid-brake or mid-spinback is let go: it runs back up to speed, forwards, from where it is. */
  private release(d: Deck, now: number) {
    const v = this.voiceAt(d, now);
    if (!v || !v.move || v.move.kind === "release" || now >= v.end) return;
    const p0 = this.posOf(v, now);
    if (v.move.kind === "spin") {
      // A backwards record can't run forwards: the song carries on from where it got to.
      fadeOut(v.gain.gain, now + 0.02, 0.02);
      v.end = now + 0.04;
      this.voice(d, now + 0.005, p0, 0.02);
      return;
    }
    const r0 = Math.max(0.05, v.src.playbackRate.value);
    v.src.playbackRate.cancelScheduledValues(now);
    v.src.playbackRate.setValueAtTime(r0, now);
    v.src.playbackRate.setTargetAtTime(1, now, RELEASE);
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(1, now + 0.02);
    v.move = { kind: "release", at: now, p0, r0 };
    v.end = Infinity;
    v.seamed = false;
    v.to = this.regionEnd(d, p0);
    d.ci = this.nextIndex(d, p0);
  }

  /** Seconds until the next bar line of whatever this deck is playing (at least `minimum` away). */
  private barWait(deck: Deck, minimum: number, now?: number) {
    return this.gridWait(deck, 4, minimum, now);
  }

  /** Seconds until the next beat of whatever this deck is playing (at least `minimum` away). */
  private beatWait(deck: Deck, minimum: number, now?: number) {
    return this.gridWait(deck, 1, minimum, now);
  }

  /**
   * Seconds from `now` to the next line of a `beats` grid in whatever this deck is playing. Its
   * position is read with the clock as it is now, which may be a render quantum or two past a `now`
   * taken earlier in the same handover: the wait is measured from `now` all the same, so the line
   * is the line.
   */
  private gridWait(deck: Deck, beats: number, minimum: number, now?: number) {
    const t = this.track(deck.cue);
    const read = this.ctx?.currentTime ?? 0;
    const pos = this.pos(deck, read);
    if (!t || pos === null) return minimum;
    return gridAfter(t, pos, beats, minimum) - pos + (now === undefined ? 0 : read - now);
  }

  /**
   * The echo cut, for every pair without a move of its own (and any song on its <audio> element):
   * in order, so no two songs are ever heard together. The outgoing song is thrown into the echo as
   * a high-pass thins it, and stops dead on its next half-bar line; its echoes ring through one beat
   * of the incoming song's air and are cleared; then the new song comes in on its downbeat, rising
   * out of a low-pass over its first beat. A line waiting for the new song makes it quicker: the cut
   * comes on the next beat and the song starts on the words, with no breath and no run-up.
   */
  private cut(out: Deck, inn: Deck, cue: CueId, token: number, now: number) {
    const ctx = this.ctx!;
    const t = this.track(cue)!;
    const line = this.lyricFor(cue);
    const beat = 60 / this.track(out.cue)!.bpm;
    // A line waiting for a decoded song: the cut comes on the outgoing song's next sixteenth and the
    // song is in 30ms later, on its words (within about 200ms of the card). An <audio> song needs its preroll.
    const quick = line && inn.kind === "buffer";
    const wait = quick ? this.gridWait(out, 0.25, 0.03, now) : line ? this.beatWait(out, 0.15, now) : this.gridWait(out, 2, 0.25, now);
    const at = now + wait;
    const start = at + (quick ? 0.03 : line ? PREROLL : Math.max(60 / t.bpm, PREROLL));

    this.delay!.delayTime.setValueAtTime(beat * 0.75, now);
    this.openEcho(now);
    out.send.gain.linearRampToValueAtTime(0.85, at);
    out.hp.frequency.exponentialRampToValueAtTime(900, at);
    out.fader.gain.setValueAtTime(out.fader.gain.value, at - 0.012);
    out.fader.gain.linearRampToValueAtTime(0, at);
    out.send.gain.linearRampToValueAtTime(0, at + 0.02);
    this.clearEcho(start - 0.07, start - 0.01);
    if (out.kind === "buffer") this.finish(out, at + 0.012);
    else if (inn.kind === "buffer") this.step(wait + 0.05, () => out.el.pause());
    this.bringIn(inn, cue, start, 1400, now);
    this.step(wait + 3, () => this.reset(out, ctx.currentTime));
    this.step(start - now + 0.05, () => this.applyLyric());
    this.handover = { kind: "cut", token, from: out.cue, to: cue, at, until: start };
  }

  /**
   * S2 into S4, through the record change: the record brakes to a stop on the next bar line (with a
   * loop roll, a half-beat then a quarter, over the two beats before it when there is room), the needle
   * lifts for one beat of the new song's air, and the new record drops on its downbeat.
   */
  private brakeOut(out: Deck, inn: Deck, cue: CueId, token: number, now: number) {
    const t = this.track(out.cue)!;
    const b = 60 / t.bpm;
    const at = now + this.barWait(out, b, now);
    const dur = BRAKE_BEATS * b;
    this.seams(out, at + dur);
    this.dropAfter(out, at);
    if (at - now >= 2 * b - 0.01) this.roll(out, at, b, now);
    const v = this.voiceAt(out, at)!;
    // The speed falls on an exponential curve, laid as short ramps so it can still be caught (a release).
    v.src.playbackRate.setValueAtTime(1, at);
    for (let i = 1; i <= BRAKE_STEPS; i++) v.src.playbackRate.linearRampToValueAtTime(brakeRate(i / BRAKE_STEPS), at + (dur * i) / BRAKE_STEPS);
    v.move = { kind: "brake", at, p0: this.posOf(v, at), dur };
    v.seamed = true;
    v.end = at + dur;
    // The sound dies with the speed: full for the first half, a raised-cosine fade over the second.
    glide(out.fader.gain, 1, 0, at + dur * 0.45, dur * 0.55);
    out.lp.frequency.setValueAtTime(OPEN, at);
    out.lp.frequency.exponentialRampToValueAtTime(500, at + dur);
    this.clearEcho(now, now + 0.03);
    this.after(out, inn, cue, token, now, at + dur, "brake", at);
  }

  /**
   * S4 away (back up into the bridge, or a jump): a spinback. On its next beat the record is thrown
   * backwards and dies away over a beat; one beat of the incoming song's air; then it drops.
   */
  private spinOut(out: Deck, inn: Deck, cue: CueId, token: number, now: number) {
    const ctx = this.ctx!;
    const t = this.track(out.cue)!;
    const b = 60 / t.bpm;
    const at = now + this.beatWait(out, 0.12, now);
    this.seams(out, at);
    const v = this.voiceAt(out, at)!;
    const from = this.posOf(v, at);
    this.dropAfter(out, at);
    fadeOut(v.gain.gain, at, EDGE);
    v.end = at + EDGE;
    v.seamed = true;
    // What was just heard, reversed: the record turning backwards under the hand.
    const song = this.decoded.get(out.source!)!;
    const sr = song.buf.sampleRate;
    const len = Math.floor(3 * sr);
    const i0 = Math.floor((from - song.pad) * sr);
    const rev = ctx.createBuffer(song.buf.numberOfChannels, len, sr);
    for (let c = 0; c < song.buf.numberOfChannels; c++) {
      const src = song.buf.getChannelData(c);
      const dst = rev.getChannelData(c);
      for (let i = 0; i < len; i++) dst[i] = src[Math.max(0, i0 - i)];
    }
    const src = ctx.createBufferSource();
    src.buffer = rev;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(out.low);
    src.playbackRate.setValueAtTime(0.4, at);
    src.playbackRate.linearRampToValueAtTime(3, at + SPIN_UP);
    src.playbackRate.setTargetAtTime(0.05, at + SPIN_UP, b * 0.3);
    gain.gain.setValueAtTime(0, at - EDGE);
    gain.gain.linearRampToValueAtTime(1, at);
    glide(gain.gain, 1, 0, at + b * 0.3, b * 0.7);
    out.hp.frequency.setValueAtTime(SHUT, at);
    out.hp.frequency.exponentialRampToValueAtTime(260, at + b);
    src.start(Math.max(now, at - EDGE));
    const spin: Voice = { src, gain, at, pos: from, to: -Infinity, end: at + b, move: { kind: "spin", at, p0: from, dur: b }, seamed: true };
    out.voices.push(spin);
    this.clearEcho(now, now + 0.03);
    this.after(out, inn, cue, token, now, at + b, "spin", at);
  }

  /** The incoming song after a move that ends at `end`: one beat of its air, then its drop. */
  private after(out: Deck, inn: Deck, cue: CueId, token: number, now: number, end: number, kind: "brake" | "spin" = "brake", at = now) {
    const t = this.track(cue)!;
    const start = end + 60 / t.bpm;
    this.clearEcho(now, now + 0.03);
    this.bringIn(inn, cue, start, 350, now);
    this.step(end - now + 3, () => this.reset(out, this.ctx!.currentTime));
    this.step(start - now + 0.05, () => this.applyLyric());
    this.handover = { kind, token, from: out.cue, to: cue, at, until: start };
  }

  /** The incoming deck heard from `start`: out of a low-pass from `lpFrom` over its first beat. */
  private bringIn(inn: Deck, cue: CueId, start: number, lpFrom: number, now: number) {
    const ctx = this.ctx!;
    const t = this.track(cue)!;
    inn.fader.gain.setValueAtTime(0, start);
    inn.fader.gain.linearRampToValueAtTime(inn.level, start + 0.015);
    inn.lp.frequency.setValueAtTime(lpFrom, start);
    inn.lp.frequency.exponentialRampToValueAtTime(OPEN, start + 60 / t.bpm);
    if (inn.kind === "buffer") {
      const e = this.entry(cue, inn);
      this.program(inn, e.first, e.cycle);
      this.start(inn, start, e.at);
      return;
    }
    // An <audio> deck can only start now: started up to LEAD_IN ahead, playing silently (its fader shut)
    // until it is heard, placed so what reaches the graph at `start` is its entry. An element starts a
    // little late, so while still silent it is measured against the audio clock and caught up by
    // running it briefly faster (or slower): no seek, which would make it later still.
    this.step(Math.max(0, start - now - LEAD_IN), () => {
      if (inn.kind !== "element") return;
      const e = this.entry(cue, inn);
      this.program(inn, e.first, e.cycle);
      inn.el.preservesPitch = false;
      inn.el.currentTime = Math.max(0, e.at - Math.max(0, start - ctx.currentTime) + ELEMENT_LAG);
      this.start(inn, start);
    });
    // Every 40ms of the silent lead-in: where the element really is, against where it must be when it
    // is heard; its speed steered to close the gap by then (it may still be getting going), then locked.
    const trim = () => {
      if (inn.kind !== "element") return;
      const left = start - ctx.currentTime - 0.06;
      if (left <= 0.02) {
        inn.el.playbackRate = 1;
        return;
      }
      const e = this.entry(cue, inn);
      const err = inn.el.currentTime - ELEMENT_LAG + (start - ctx.currentTime) - e.at;
      inn.el.playbackRate = inn.el.paused || Math.abs(err) < 0.004 ? 1 : Math.min(3, Math.max(0.5, 1 - err / left));
      this.step(0.04, trim);
    };
    this.step(Math.max(0, start - now - LEAD_IN) + 0.05, trim);
  }

  /** The outgoing deck's voices are done from `at` (its fader is already on its way to 0 there). */
  private finish(d: Deck, at: number) {
    this.seams(d, at);
    this.dropAfter(d, at);
    for (const v of d.voices) {
      if (v.end <= at) continue;
      // Stopped for good, not only marked: a deck that later turns to its <audio> is never ticked again.
      stopAt(v.src, at + EDGE);
      v.end = at;
      v.seamed = true;
    }
  }

  /**
   * A loop roll on the beats before `at`, in slip: a half-beat slice repeated, then a quarter-beat;
   * the song runs on muted under it. Each repeat is its own grain with 2ms edges, as a sampler plays
   * a stutter, so no repeat clicks where it wraps.
   */
  private roll(out: Deck, at: number, b: number, now: number) {
    const ctx = this.ctx!;
    const song = this.decoded.get(out.source!)!;
    const t0 = at - 2 * b;
    if (t0 < now + 0.03) return;
    // Each slice starts LEAD before its grid line, like a seam, so the hit on the line repeats whole.
    const under = this.voiceAt(out, t0)!;
    under.gain.gain.setValueAtTime(1, t0 - LEAD - EDGE);
    under.gain.gain.linearRampToValueAtTime(0, t0 - LEAD);
    under.gain.gain.setValueAtTime(0, at - LEAD - EDGE);
    under.gain.gain.linearRampToValueAtTime(1, at - LEAD);
    for (const [k, len] of [
      [0, 0.5],
      [1, 0.25],
    ] as const) {
      const s = t0 + k * b;
      const v = this.voiceAt(out, s)!;
      const off = this.posOf(v, s) - song.pad - LEAD;
      const g = len * b;
      for (let j = 0; j < Math.round(1 / len); j++) {
        const t = s + j * g - LEAD;
        const src = ctx.createBufferSource();
        src.buffer = song.buf;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(gain);
        gain.connect(out.low);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(1, t + GRAIN);
        gain.gain.setValueAtTime(1, t + g - GRAIN);
        gain.gain.linearRampToValueAtTime(0, t + g);
        src.start(t, off);
        src.stop(t + g + 0.005);
        out.extra.push({ src, end: t + g + 0.005 });
      }
    }
  }

  /**
   * The end card's line while the intro plays: a same-song cut to the song itself on the intro's next
   * beat, straight onto the beat before the line ("So" under a beat later). Two sources, one song at a
   * time: the intro is silent 20ms before the song comes in.
   */
  private introToLine(out: Deck, lyric: Lyric, line: LyricLine) {
    const decks = this.decks!;
    const now = this.ctx!.currentTime;
    const at = now + this.beatWait(out, 0.12, now);
    const token = this.begin(now, false);
    const inn = out === decks[0] ? decks[1] : decks[0];
    this.live = decks.indexOf(inn);
    this.silence(inn);
    this.load(inn, line.cue);
    this.reset(inn, now);
    this.clearEcho(now, now + 0.03);
    // Silent by the last quiet moment before the beat (where a seam would cross: none is queued, so
    // no loop seam sounds just before the cut): 20ms of air between the two sources.
    fadeOut(out.fader.gain, at - LEAD, EDGE);
    if (out.kind === "buffer") this.finish(out, at - LEAD - SEAM - 0.001);
    else this.step(at - now + 0.05, () => out.el.pause());
    inn.fader.gain.setValueAtTime(0, at);
    inn.fader.gain.linearRampToValueAtTime(inn.level, at + EDGE);
    if (inn.kind === "buffer") {
      this.program(inn, null, [line.hold]);
      this.start(inn, at, line.approach);
    } else {
      this.step(at - now - PREROLL, () => {
        this.program(inn, null, [line.hold]);
        inn.el.currentTime = line.approach - PREROLL + ELEMENT_LAG;
        this.start(inn, at);
      });
    }
    lyric.state = "armed";
    this.handover = { kind: "cut", token, from: out.cue, to: line.cue, at, until: at };
  }

  /**
   * Back from the song to its intro (scrolling up from the end card): the song stops on its bar, and
   * the intro comes in at its first phrase.
   */
  private toIntro(out: Deck, inn: Deck) {
    const now = this.ctx!.currentTime;
    const at = now + this.barWait(out, 0.3, now);
    const token = this.begin(now, false);
    this.live = this.decks!.indexOf(inn);
    this.load(inn, "S4", true);
    this.reset(inn, now);
    this.clearEcho(now, now + 0.03);
    // Silent by the last quiet moment before the bar line (as in introToLine): no seam sounds first.
    fadeOut(out.fader.gain, at - LEAD, EDGE);
    if (out.kind === "buffer") this.finish(out, at - LEAD - SEAM - 0.001);
    this.bringIn(inn, "S4", at, OPEN, now);
    this.handover = { kind: "cut", token, from: out.cue, to: "S4", at, until: at };
  }

  /**
   * The end card's line left before its song was heard: the deck waiting with the song takes the
   * intro instead, at the moment the song would have come in. Everything already queued on it is
   * dropped first, so nothing of the song can sound under the intro; the deck it follows is already
   * on its way out by then.
   */
  private introInstead(d: Deck, h: Handover) {
    const now = this.ctx!.currentTime;
    const at = Math.max(h.until, now + 0.02);
    this.silence(d, now);
    this.load(d, "S4", true);
    d.fader.gain.setValueAtTime(0, at);
    d.fader.gain.linearRampToValueAtTime(d.level, at + 0.015);
    const e = this.entry("S4", d);
    this.program(d, e.first, e.cycle);
    this.start(d, at, e.at);
    this.handover = { ...h, until: at };
  }

  /** Plans the focused lyric on the live deck, if it is that lyric's song. */
  private applyLyric() {
    const lyric = this.lyric;
    if (!lyric || lyric.cued || lyric.state !== "pending" || !this.decks || !this.ctx || !this.state.soundOn) return;
    const line = LYRICS[lyric.id];
    const d = this.decks[this.live];
    const h = this.handover;
    const now = this.ctx.currentTime;
    // Its song cued up by a cut but not heard yet: it comes in at the line, silently moved there (the
    // song itself, not its intro, when the intro was on its way).
    if (d.cue === line.cue && h && h.kind !== "rise" && h.kind !== "return" && now < h.until - 0.02) {
      // Back onto the line before the song it was leaving had gone (off the end card and on again within
      // the bar): that song is still running into its line, so it carries on and the cut is called off.
      const heard = this.decks[1 - this.live];
      if (h.from === line.cue && h.to === line.cue && heard.cue === line.cue && !this.onIntro(heard) && this.gainOf(heard, now) > AUDIBLE) return this.resume(heard);
      if (this.onIntro(d)) {
        this.dropAfter(d, now + 0.01);
        this.load(d, line.cue);
        d.fader.gain.cancelScheduledValues(now);
        d.fader.gain.setValueAtTime(0, Math.max(now, h.until - 0.001));
        d.fader.gain.linearRampToValueAtTime(d.level, h.until + 0.015);
      }
      if (d.kind === "buffer") {
        this.dropAfter(d, now + 0.01);
        this.program(d, null, [line.hold]);
        this.start(d, h.until, line.approach);
      } else {
        if (d.el.paused) return;
        d.el.currentTime = Math.max(0, line.approach - (h.until - now));
        d.loop = line.hold;
        d.then = null;
      }
      lyric.state = "armed";
      return;
    }
    const pos = this.pos(d);
    if (d.cue !== line.cue || pos === null) return;
    if (this.onIntro(d)) return this.introToLine(d, lyric, line);
    // Already running into the line from its own approach, its first word still ahead: on into it, then held.
    if (pos >= line.approach - 0.05 && pos < line.hold[0] && pos < line.words[0].t - 0.1) {
      this.program(d, null, [line.hold]);
      lyric.state = "armed";
      return;
    }
    const bar = 240 / this.track(line.cue)!.bpm;
    // Already in the bars that carry the line: just hold them.
    if (pos >= line.hold[0] && pos < line.hold[1] - bar) {
      this.program(d, null, [line.hold]);
      lyric.state = "armed";
      this.bring();
      return;
    }
    this.dip(d, lyric, line, this.wayIn(d, line));
  }

  /** A line on screen that is still more than a bar away is brought in on the next beat, if that gets there sooner. */
  private bring() {
    const lyric = this.lyric;
    if (!lyric || lyric.cued || !this.decks || !this.ctx || !this.state.soundOn) return;
    const line = LYRICS[lyric.id];
    const d = this.decks[this.live];
    if (d.cue !== line.cue || this.pos(d) === null) return;
    if (lyric.state === "pending") return this.applyLyric();
    const bar = 240 / this.track(line.cue)!.bpm;
    const eta = this.eta(d, line, lyric);
    if (eta <= bar + 0.1) return;
    const plan = this.wayIn(d, line);
    if (plan.wait + (line.words[0].t - plan.target) >= eta - 0.25) return;
    this.dip(d, lyric, line, plan);
  }

  /** Seconds until the line's first word as things stand: 0 while it is sung, Infinity if it isn't coming. */
  private eta(d: Deck, line: LyricLine, lyric: Lyric) {
    const first = line.words[0].t;
    if (lyric.state === "approaching" && lyric.jumpAt !== undefined && lyric.jumpTo !== undefined) {
      return Math.max(0, lyric.jumpAt - this.ctx!.currentTime) + (first - lyric.jumpTo);
    }
    const pos = this.pos(d) ?? 0;
    if (pos >= first - 0.05 && pos <= line.words[line.words.length - 1].t + 0.4) return 0;
    if (pos < first) return first - pos;
    const loop = d.kind === "element" ? d.loop : d.cycle.find(([a, b]) => first >= a && first < b);
    if (loop && first >= loop[0] && first < loop[1]) return loop[1] - pos + first - loop[0];
    return Infinity;
  }

  /**
   * How a playing song gets to a line on screen, on its next beat line: straight onto the line
   * when it starts on its words (no run-up), otherwise to the same beat of the bar before the
   * line, so the meter runs straight on and the line arrives within a bar.
   */
  private wayIn(d: Deck, line: LyricLine) {
    const t = this.track(line.cue)!;
    const bar = 240 / t.bpm;
    const beat = bar / 4;
    // The clock and the position read together: the jump is timed from this reading.
    const read = this.ctx?.currentTime ?? 0;
    const pos = this.pos(d, read) ?? 0;
    const phase = (((pos - t.downbeat) % bar) + bar) % bar;
    let k = Math.floor(phase / beat + 1e-6) + 1;
    let wait = k * beat - phase;
    if (wait < 0.12) {
      k += 1;
      wait += beat;
    }
    const first = line.words[0].t;
    if (first - line.approach < beat) return { wait, target: line.approach, read };
    let target = lineBar(t, line) + (k % 4) * beat;
    if (first - target < 0.15) target -= bar;
    return { wait, target, read };
  }

  /**
   * The jump onto a line, on the beat. A decoded song jumps exactly there (a beat jump, crossfaded in
   * 3ms). An <audio> deck can only seek from a timer, so its jump is hidden by a tight dip whose floor
   * is held long enough to cover the seek.
   */
  private dip(d: Deck, lyric: Lyric, line: LyricLine, plan: { wait: number; target: number; read?: number }) {
    const now = plan.read ?? this.ctx!.currentTime;
    const n = ++lyric.jump;
    lyric.state = "approaching";
    lyric.jumpAt = now + plan.wait;
    lyric.jumpTo = plan.target;
    const at = now + plan.wait;
    if (d.kind === "buffer") {
      this.jumpTo(d, at, plan.target, null, [line.hold]);
      this.step(plan.wait, () => {
        if (this.lyric === lyric && lyric.jump === n) lyric.state = "armed";
      });
      return;
    }
    // Whatever the fader was doing (a song still coming in, say) carries on up to the dip.
    holdAt(d.fader.gain, at - 0.03, d.level);
    d.fader.gain.linearRampToValueAtTime(0.05, at);
    d.fader.gain.setValueAtTime(0.05, at + 0.05);
    d.fader.gain.linearRampToValueAtTime(d.level, at + 0.09);
    this.step(plan.wait, () => {
      if (this.lyric !== lyric || lyric.jump !== n) return;
      d.el.currentTime = plan.target;
      d.loop = line.hold;
      d.then = null;
      lyric.state = "armed";
    });
  }

  /** Gives a deck its song's own program back, joining it on the bar (an <audio> deck: at the next point in the bar where its loop ends). */
  private rejoin(d: Deck) {
    const t = this.track(d.cue);
    if (!t) return;
    if (d.kind === "buffer") {
      const own = this.own(t);
      this.program(d, own.first, own.cycle);
      return;
    }
    const [start, end] = t.loop;
    const pos = d.el.currentTime;
    if (pos < end - 0.05) {
      d.loop = t.loop;
      d.then = null;
      return;
    }
    const bar = 240 / t.bpm;
    d.loop = [start, end + Math.ceil((pos + 0.25 - end) / bar) * bar];
    d.then = t.loop;
  }

  private later(seconds: number, fn: () => void) {
    this.timers.push({ id: window.setTimeout(fn, seconds * 1000), token: 0 });
  }

  /** A timer that belongs to the current handover (bookkeeping only; what is heard is on the audio clock). */
  private step(seconds: number, fn: () => void) {
    const token = this.token;
    const id = window.setTimeout(() => {
      this.timers = this.timers.filter((t) => t.id !== id);
      if (token === this.token) fn();
    }, Math.max(0, seconds) * 1000);
    this.timers.push({ id, token });
  }

  private clearTimers() {
    this.timers.forEach((t) => clearTimeout(t.id));
    this.timers = [];
  }
}

/** A released record's time constant back to speed (s). */
const RELEASE = 0.08;
/** A spinback's throw: how fast it reaches full reverse speed (s). */
const SPIN_UP = 0.09;

/** A brake's speed at fraction `x` of its length: 1 falling to (almost) 0 on an exponential curve. */
function brakeRate(x: number) {
  return Math.max(0.0001, (Math.exp(-BRAKE_K * x) - Math.exp(-BRAKE_K)) / (1 - Math.exp(-BRAKE_K)));
}

/** Song time a brake covers in its first `u` seconds of `dur`: the area under its ramps, exactly. */
function brakeTravel(u: number, dur: number) {
  const h = dur / BRAKE_STEPS;
  let s = 0;
  for (let i = 0; i < BRAKE_STEPS; i++) {
    const a = i * h;
    if (u <= a) break;
    const w = Math.min(h, u - a);
    const r0 = i === 0 ? 1 : brakeRate(i / BRAKE_STEPS);
    const r1 = brakeRate((i + 1) / BRAKE_STEPS);
    s += w * (r0 + ((r1 - r0) * w) / (2 * h));
  }
  return s;
}

/** Song time a spinback winds back in its first `u` seconds of `dur`. */
function spinTravel(u: number, dur: number) {
  if (u <= SPIN_UP) return 0.4 * u + ((3 - 0.4) / SPIN_UP) * (u * u) / 2;
  const tau = dur * 0.3;
  const w = u - SPIN_UP;
  return 0.4 * SPIN_UP + ((3 - 0.4) * SPIN_UP) / 2 + 0.05 * w + (3 - 0.05) * tau * (1 - Math.exp(-w / tau));
}

/**
 * Where a decoded source sits against its own timeline: its loudness fingerprint (lib/sync.ts) found in
 * the decode within ±120ms of `ref.pad`, the expected offset. A decode that can't be matched keeps that.
 */
function calibrate(buf: AudioBuffer, ref: { at: number; hop: number; pad: number; env: number[] }) {
  const x = buf.getChannelData(0);
  const sr = buf.sampleRate;
  // Hops at the fingerprint's exact spacing in seconds, whatever the decode's sample rate.
  const hop = ref.hop * sr;
  const win = Math.round(hop);
  const n = ref.env.length;
  const search = Math.round(0.12 / ref.hop);
  const i0 = (ref.at - ref.pad) * sr - search * hop;
  const env = new Float32Array(n + 2 * search);
  for (let k = 0; k < env.length; k++) {
    const from = Math.round(i0 + k * hop);
    let s = 0;
    for (let j = 0; j < win; j++) {
      const v = x[from + j] ?? 0;
      s += v * v;
    }
    env[k] = Math.sqrt(s / win);
  }
  const mean = (a: ArrayLike<number>, o: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += a[o + i];
    return s / n;
  };
  const mr = mean(ref.env, 0);
  const score = (lag: number) => {
    const me = mean(env, lag);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      const p = ref.env[i] - mr;
      const q = env[lag + i] - me;
      num += p * q;
      da += p * p;
      db += q * q;
    }
    return num / Math.sqrt(da * db + 1e-12);
  };
  let best = -2;
  let lag = 0;
  const scores = new Float32Array(2 * search + 1);
  for (let L = 0; L <= 2 * search; L++) {
    scores[L] = score(L);
    if (scores[L] > best) {
      best = scores[L];
      lag = L;
    }
  }
  if (best < 0.8) return ref.pad;
  // Sub-hop refinement on the peak (parabolic).
  let frac = 0;
  if (lag > 0 && lag < 2 * search) {
    const [a, b, c] = [scores[lag - 1], scores[lag], scores[lag + 1]];
    const den = a - 2 * b + c;
    if (den < 0) frac = (0.5 * (a - c)) / den;
  }
  return ref.pad - (lag + frac - search) * ref.hop;
}

/** The first grid line (every `beats` beats) at least `minimum` of song time after `pos`. */
function gridAfter(t: Track, pos: number, beats: number, minimum: number) {
  const span = (60 / t.bpm) * beats;
  return t.downbeat + Math.ceil((pos + minimum - t.downbeat) / span) * span;
}

/** Every automated parameter on a deck. */
function params(d: Deck) {
  return [d.fader.gain, d.low.gain, d.hp.frequency, d.lp.frequency, d.send.gain];
}

/** Freeze an automated parameter at its current value so new ramps start from where it is. */
function hold(param: AudioParam, now: number) {
  const value = param.value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(value, now);
}

/**
 * Keep a parameter's automation up to `time`, holding the value it reaches then and dropping what
 * was planned after. Without cancelAndHoldAtTime, it is set to `fallback` there instead.
 */
function holdAt(param: AudioParam, time: number, fallback: number) {
  if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(time);
  else {
    param.cancelScheduledValues(time);
    param.setValueAtTime(fallback, time);
  }
}

/**
 * A gain to 0 over `ramp`, ending at `at`, whatever it was doing up to then, falling linearly from
 * the value it holds at `at - ramp`. A linear ramp on its own would run from the last event planned
 * before then, however long ago (a fade of seconds, or a jump now). Following a setTarget it starts
 * where that would (spec, and measured in Chrome): at `at - ramp` with the value held there, or now
 * with the value now if that is already past. The setTarget itself never sounds.
 */
function fadeOut(param: AudioParam, at: number, ramp: number) {
  const from = Math.max(0, at - ramp);
  if (typeof param.cancelAndHoldAtTime !== "function") {
    // Firefox: setting a value at `from` would set the one read now, which may be a fader still open.
    param.cancelScheduledValues(from);
    param.setTargetAtTime(0, from, ramp / 3);
    param.linearRampToValueAtTime(0, Math.max(from, at) + ramp);
    return;
  }
  holdAt(param, from, param.value);
  param.setTargetAtTime(0, from, ramp);
  param.linearRampToValueAtTime(0, Math.max(from, at));
}

/**
 * A raised-cosine move of a parameter from a to b over [t0, t0 + dur], on the audio clock. Laid as
 * short linear ramps rather than a value curve, so a newer handover can always freeze it where it is.
 */
function glide(param: AudioParam, a: number, b: number, t0: number, dur: number) {
  const n = 16;
  holdAt(param, t0, a);
  param.setValueAtTime(a, t0);
  for (let i = 1; i <= n; i++) param.linearRampToValueAtTime(a + (b - a) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n)), t0 + (dur * i) / n);
}

function stopNow(src: AudioScheduledSourceNode) {
  try {
    src.stop();
  } catch {}
  src.disconnect();
}

function stopAt(src: AudioScheduledSourceNode, at: number) {
  try {
    src.stop(at);
  } catch {}
}

/** The downbeat of the bar a line is sung out of (the bar holding its first word, or that word's pickup). */
function lineBar(t: Track, line: LyricLine) {
  const bar = 240 / t.bpm;
  return t.downbeat + Math.floor((line.words[0].t - 0.1 - t.downbeat) / bar) * bar;
}

/**
 * One director per page. A hot reload (or this module evaluated twice) would otherwise leave the
 * old director's sources playing under the new one's: the old one hands over what the page knows
 * (and the songs it decoded) and stops for good before the new one is registered.
 */
function install() {
  const g = globalThis as unknown as { __portfolioDirector?: AudioDirector };
  const prev = g.__portfolioDirector;
  const director = new AudioDirector(prev?.handOff(), prev?.songs());
  prev?.dispose();
  g.__portfolioDirector = director;
  return director;
}

export const audio = typeof window === "undefined" ? new AudioDirector() : install();

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __director: AudioDirector }).__director = audio;
}

/** What the server renders with, and what hydration compares against: the director before anything happens. */
const FIRST: DirectorState = { tracks: [], cue: null, soundOn: false, started: false, ready: false };

/**
 * One value from the director's state, for components that need only that: they re-render when it
 * changes and at no other time (as a transition, like useDirector). `pick` must be stable (declare it
 * outside the component). The shell uses it, so a change of song never re-renders the page under it.
 */
export function useDirectorValue<T>(pick: (s: DirectorState) => T) {
  const [value, setValue] = useState(() => pick(FIRST));
  useEffect(() => {
    let last = pick(FIRST);
    const sync = () => {
      const next = pick(audio.getState());
      if (Object.is(next, last)) return;
      last = next;
      startTransition(() => setValue(next));
    };
    sync();
    const off = audio.subscribe(sync);
    return () => {
      off();
    };
  }, [pick]);
  return value;
}

/**
 * The director's state for the UI (the gate, the player, what is playing). It starts as FIRST,
 * so hydration matches the server, and changes arrive as a transition: a scene change sets the
 * cue, and as a transition React renders everything that shows it in small slices between frames
 * instead of in one long frame at the cut. The music itself never waits on React.
 */
export function useDirector() {
  const [state, setState] = useState(FIRST);
  useEffect(() => {
    const sync = () => startTransition(() => setState(audio.getState()));
    sync();
    const off = audio.subscribe(sync);
    return () => {
      off();
    };
  }, []);
  return state;
}
