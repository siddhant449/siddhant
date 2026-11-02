import type { CueId } from "./tracks";

export type LyricWord = { w: string; t: number };
export type LyricLine = {
  id: string;
  cue: CueId;
  words: LyricWord[];
  /**
   * Where the song comes in for the line, or jumps to when the line comes on screen. Within a
   * beat of the first word, it is the line itself: the song starts on the words, no run-up.
   */
  approach: number;
  /** The bar-aligned region the deck loops while the line is on screen. */
  hold: [number, number];
};

/**
 * One short hook per song, timed per word inside its 30s preview so type can land on the
 * sung word. Kept to a single short phrase per song: the site quotes, it doesn't publish lyrics.
 *
 * Timings are positions on the <audio> element's timeline (lib/sync.ts), each word's onset measured
 * on the separated vocal stem (level and pitch onsets, with whisper's word boundaries as the guide),
 * to within about 20ms.
 */
export const LYRICS: Record<string, LyricLine> = {
  workIt: {
    id: "workIt",
    cue: "S2",
    // Stressed words on beats 1 and 3, each "it" on the following eighth. The intro's last bar
    // breaks on a hit at 8.78 that has died away by 9.05: coming in there, "Work" (on the 9.266
    // downbeat) is the first thing that lands. The hold is the bar before the line through its last
    // word, so a repeat runs on seamlessly.
    approach: 9.05,
    hold: [7.322, 13.153],
    words: [
      { w: "Work", t: 9.245 },
      { w: "it,", t: 9.485 },
      { w: "make", t: 10.22 },
      { w: "it,", t: 10.458 },
      { w: "do", t: 11.221 },
      { w: "it,", t: 11.453 },
      { w: "makes", t: 12.176 },
      { w: "us", t: 12.455 },
    ],
  },
  liveYourLife: {
    id: "liveYourLife",
    cue: "S4",
    // Kept for the end card: until then the song plays only its hook bars. On the line the song jumps,
    // on its next beat, to beat 3 of the bar that carries it (5.528), so "So" comes in under a beat
    // later; the line then runs on into the song's own drop and its hook bar, which holds.
    approach: 5.528,
    hold: [7.028, 10.028],
    words: [
      { w: "So", t: 6.01 },
      { w: "live", t: 6.14 },
      { w: "your", t: 6.39 },
      { w: "life", t: 6.67 },
    ],
  },
};

export const lineText = (line: LyricLine) => line.words.map((w) => w.w).join(" ");

/** Seconds after the last word that the line stays lit before it falls back into shadow. */
export const LYRIC_HOLD = 2.4;
