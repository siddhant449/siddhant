import { cacheLife } from "next/cache";

export type CueId = "S1" | "S2" | "S4";

export type Track = {
  id: number;
  cue: CueId;
  title: string;
  artist: string;
  preview: string;
  artwork: string;
  link: string;
  /** Tempo and the time of a known downbeat inside the 30s preview: the bar grid every cut is planned on. */
  bpm: number;
  downbeat: number;
  /** Where the song rises in from the mist (first sound, sound back on). */
  startAt: number;
  /** Where it drops in after another song: on a downbeat, or a beat's pickup into one. */
  drop: number;
  /** The bar-aligned region it plays while its scenes are on screen. */
  loop: [number, number];
  /**
   * What follows `loop`, round and round, each region joined to the next on the bar line. Unset: the
   * loop itself repeats.
   */
  cycle?: [number, number][];
  /**
   * Downbeats the song comes in on that open on the held last word of the line before: when the
   * song enters there (a drop or a loop seam), that tail is dipped out of the mids for 0.2s.
   */
  tails?: number[];
  /** Named moments inside the preview (seconds). */
  landmarks: Record<string, number>;
  /**
   * The song's own intro, where the song preview starts later: the audio of Apple's official
   * music-video preview, fetched from Apple each visit (only its audio frames, by range request: about
   * 0.5MB of the 18MB file; never copied or stored) and decoded. Times are the video's own.
   */
  intro?: {
    /** The music video's iTunes id, and its preview URL (refreshed from the lookup API like the songs'). */
    id: number;
    url: string;
    /** Its bar 1: the first sample phrase. */
    at: number;
    /** What it plays: all its bars once, then the first two round and round. */
    first: [number, number];
    loop: [number, number];
    /** Added to its time to put it on the song's own bar grid, clear of every line the song sings. */
    shift: number;
    /** Its level against the song preview (dB). */
    gain: number;
  };
};

// Apple's official 30-second previews, served with open CORS headers so they can be decoded and read
// by the Web Audio analyser. Every time below is on the <audio> element's timeline (see lib/sync.ts)
// and was measured on these exact previews: beat grids fitted to percussive onsets (5-12 ms rms),
// downbeats from kick, snare and chord changes, keys from tuned chroma on separated stems, loop seams
// scored on the mix and on the vocal stem, words from onsets on the vocal stem.
const FALLBACK: Track[] = [
  {
    id: 1454026498,
    cue: "S1",
    title: "All the Things She Said",
    artist: "t.A.T.u.",
    preview:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/04/ef/b7/04efb7c0-63b8-0164-cdd9-f7d7a93c1372/mzaf_15885597228946383675.plus.aac.p.m4a",
    artwork:
      "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/cb/7d/73/cb7d73a3-b77f-aec4-b1ee-dd759c35374c/06UMGIM34819.rgb.jpg/300x300bb.jpg",
    link: "https://music.apple.com/us/song/1454026498",
    // F minor (4A). The chorus phrase runs 8 bars from 3.588.
    bpm: 89.99,
    downbeat: 0.921,
    // The chorus pickup (beat 4), under the mist; after silence, just before "All" so the downbeat lands.
    startAt: 2.921,
    drop: 3.46,
    // Two bars whose lyric runs straight across the seam ("running through my head / all the things she said").
    loop: [6.255, 11.59],
    landmarks: { chorus: 3.588 },
  },
  {
    id: 697195787,
    cue: "S2",
    title: "Harder Better Faster Stronger",
    artist: "Daft Punk",
    preview:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8d/a4/4e/8da44e8f-9705-6182-686c-332714c54671/mzaf_17406318046701183138.plus.aac.p.m4a",
    artwork:
      "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/fd/4a/77/fd4a77db-0ebc-d043-41a2-f32fa1bb0fb4/dj.qrikkdwj.jpg/300x300bb.jpg",
    link: "https://music.apple.com/us/song/697195787",
    // F# minor (11A), 42 cents sharp. The intro's last bar breaks on a hit at 8.78 that dies away
    // before "Work it" (9.266); "Harder, better, faster, stronger" opens the next phrase (17.041).
    bpm: 123.47,
    downbeat: 1.491,
    startAt: 7.322,
    drop: 17.041,
    // Eight bars, from the break bar to the end of the second phrase.
    loop: [7.322, 22.872],
    landmarks: { workIt: 9.266, harder: 17.041 },
  },
  {
    id: 1258981727,
    cue: "S4",
    title: "Live Your Life",
    artist: "T.I. ft. Rihanna",
    preview:
      "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b8/27/96/b8279642-e8e1-7507-d777-5044d56ac998/mzaf_17901772466066068461.plus.aac.p.m4a",
    artwork:
      "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/dc/18/c1/dc18c1e1-49a3-a53c-3064-db77a5f1e36d/075679990617_art.jpg/300x300bb.jpg",
    link: "https://music.apple.com/us/song/1258981727",
    // D major (10B). Two quiet bars carry the line ("…so live your life", 6.01), then the drums drop
    // on 7.028 with the hook ("ay, ay, ay"); after that every other bar is a line ending "…just live
    // your life". The song plays only its hook bars until the end card sings the line.
    bpm: 80,
    downbeat: 1.028,
    startAt: 7.028,
    drop: 7.028,
    loop: [7.028, 10.028],
    cycle: [
      [13.028, 16.028],
      [19.028, 22.028],
      [25.028, 28.028],
    ],
    tails: [7.028, 13.028, 19.028, 25.028],
    landmarks: { line: 6.01, drop: 7.028 },
    // The intro, from the music video's preview: O-Zone's "ma-i-a hi, ma-i-a hu" under T.I.'s lines, from
    // its first phrase (17.81) to "let's give it to 'em, baby girl" (29.81): four bars at the song's 80bpm,
    // in its key and tuning (held notes within 7 cents). Its first two bars end on the one bar line T.I.
    // isn't talking over, so they make the loop. Mixed 15dB below the song preview: lifted 11dB.
    intro: {
      id: 1656038356,
      url: "https://video-ssl.itunes.apple.com/itunes-assets/Video112/v4/bb/c8/59/bbc859b9-9368-735e-602a-9b14e4b140e6/mzvf_3761167083085306738.1920w.h264lc.U.p.m4v",
      at: 17.81,
      first: [17.81, 29.81],
      loop: [17.81, 23.81],
      shift: 16.218,
      gain: 11,
    },
  },
];

type LookupResult = { trackId: number; previewUrl?: string; artworkUrl100?: string };

/**
 * Refreshes preview URLs from the iTunes lookup API once a day; falls back to the known-good set.
 * A failed lookup is kept only for minutes (one `cacheLife` per call, by branch), so a blip at
 * Apple doesn't pin the fallback URLs for a day.
 */
export async function getTracks(): Promise<Track[]> {
  "use cache";

  try {
    const ids = [...FALLBACK.map((t) => t.id), ...FALLBACK.flatMap((t) => (t.intro ? [t.intro.id] : []))].join(",");
    const res = await fetch(`https://itunes.apple.com/lookup?id=${ids}`);
    if (!res.ok) {
      cacheLife("minutes");
      return FALLBACK;
    }
    const { results } = (await res.json()) as { results: LookupResult[] };
    const byId = new Map(results.map((r) => [r.trackId, r]));
    cacheLife("days");
    return FALLBACK.map((t) => {
      const r = byId.get(t.id);
      const v = t.intro && byId.get(t.intro.id);
      const intro = t.intro && v?.previewUrl ? { ...t.intro, url: v.previewUrl } : t.intro;
      if (!r?.previewUrl) return { ...t, intro };
      return {
        ...t,
        preview: r.previewUrl,
        artwork: r.artworkUrl100?.replace("100x100bb", "300x300bb") ?? t.artwork,
        intro,
      };
    });
  } catch {
    cacheLife("minutes");
    return FALLBACK;
  }
}
