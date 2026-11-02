/**
 * The audio of part of an MP4 (Apple's music-video preview), without downloading its video: the file's
 * index (its `moov`, at the front of Apple's previews) is read with one range request, the audio
 * track's AAC frames from `from` seconds on are fetched by their byte ranges, wrapped as ADTS and
 * decoded. About 0.5MB for 15s, where the whole video is 18MB. Streamed from Apple each time, never
 * stored.
 */

type Track = {
  timescale: number;
  mediaTime: number;
  delta: number;
  sizes: number[];
  /** Each chunk's file offset and how many samples it holds. */
  chunks: { offset: number; count: number }[];
  /** ADTS fields from the AudioSpecificConfig. */
  profile: number;
  freqIndex: number;
  channels: number;
};

const HEAD = 65536;
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts"]);

const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const type = (b: Uint8Array, o: number) => String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]);

/** The boxes directly inside [start, end), as name → offset (the first of each name). */
function children(b: Uint8Array, start: number, end: number) {
  const out = new Map<string, number>();
  for (let o = start; o + 8 <= end; ) {
    const size = u32(b, o);
    if (size < 8) break;
    const t = type(b, o);
    if (!out.has(t)) out.set(t, o);
    o += size;
  }
  return out;
}

/** Every trak box in the moov. */
function traks(b: Uint8Array, moov: number) {
  const out: number[] = [];
  for (let o = moov + 8; o + 8 <= moov + u32(b, moov); o += u32(b, o)) if (type(b, o) === "trak") out.push(o);
  return out;
}

function box(b: Uint8Array, from: number, path: string[]): number | null {
  let o = from;
  for (const name of path) {
    if (!CONTAINERS.has(type(b, o))) return null;
    const next = children(b, o + 8, o + u32(b, o)).get(name);
    if (next === undefined) return null;
    o = next;
  }
  return o;
}

/** The sound track's sample tables, read from the file's index. */
function readTrack(b: Uint8Array): Track | null {
  if (type(b, 0) !== "ftyp") return null;
  const moov = u32(b, 0);
  if (type(b, moov) !== "moov" || moov + u32(b, moov) > b.length) return null;
  for (const trak of traks(b, moov)) {
    const hdlr = box(b, trak, ["mdia", "hdlr"]);
    if (hdlr === null || String.fromCharCode(b[hdlr + 16], b[hdlr + 17], b[hdlr + 18], b[hdlr + 19]) !== "soun") continue;
    const stbl = box(b, trak, ["mdia", "minf", "stbl"]);
    const mdhd = box(b, trak, ["mdia", "mdhd"]);
    const elst = box(b, trak, ["edts", "elst"]);
    if (stbl === null || mdhd === null) return null;
    const t = children(b, stbl + 8, stbl + u32(b, stbl));
    const [stsd, stts, stsc, stsz, stco] = ["stsd", "stts", "stsc", "stsz", "stco"].map((n) => t.get(n));
    if ([stsd, stts, stsc, stsz, stco].some((x) => x === undefined)) return null;
    // AudioSpecificConfig: the DecSpecificInfo (tag 5) inside the sample entry's esds.
    const end = stsd! + u32(b, stsd!);
    let esds = -1;
    for (let o = stsd!; o + 4 < end; o++) if (b[o] === 0x65 && b[o + 1] === 0x73 && b[o + 2] === 0x64 && b[o + 3] === 0x73) esds = o;
    let i = esds + 12;
    while (i < end && b[i] !== 0x05) i++;
    i++;
    while (i < end && b[i] & 0x80) i++;
    i++;
    if (esds < 0 || i + 1 >= end) return null;
    const objectType = b[i] >> 3;
    const freqIndex = ((b[i] & 7) << 1) | (b[i + 1] >> 7);
    const channels = (b[i + 1] >> 3) & 15;
    const n = u32(b, stsz! + 16);
    const uniform = u32(b, stsz! + 12);
    const sizes = Array.from({ length: n }, (_, k) => uniform || u32(b, stsz! + 20 + 4 * k));
    const runs = Array.from({ length: u32(b, stsc! + 12) }, (_, k) => ({ first: u32(b, stsc! + 16 + 12 * k), count: u32(b, stsc! + 20 + 12 * k) }));
    const offsets = Array.from({ length: u32(b, stco! + 12) }, (_, k) => u32(b, stco! + 16 + 4 * k));
    const chunks = offsets.map((offset, c) => {
      let count = runs[0].count;
      for (const r of runs) if (c + 1 >= r.first) count = r.count;
      return { offset, count };
    });
    return {
      timescale: u32(b, mdhd + 20),
      mediaTime: elst === null ? 0 : u32(b, elst + 20),
      delta: u32(b, stts! + 20),
      sizes,
      chunks,
      profile: objectType - 1,
      freqIndex,
      channels,
    };
  }
  return null;
}

/**
 * Fetches and decodes the audio of `url` from `from` seconds (its own presentation time) to its end.
 * `t0` is the presentation time of the decode's first sample, as the frame table has it; the decoder's
 * own delay is for the caller to line up (lib/audio.ts does it against a fingerprint).
 */
export async function loadIntroAudio(url: string, from: number, sampleRate: number, signal?: AbortSignal) {
  // Every request is a byte range, and must come back as one (206, its exact length): a server or proxy
  // that ignores Range would send the whole 18MB video for each of them. The first failure (or the
  // caller's signal, its timeout) aborts the rest, and the caller falls back to the song's own drop.
  const ctl = new AbortController();
  const stop = () => ctl.abort();
  if (signal?.aborted) stop();
  signal?.addEventListener("abort", stop, { once: true });
  const range = async (a: number, b: number) => {
    const res = await fetch(url, { headers: { Range: `bytes=${a}-${b}` }, signal: ctl.signal });
    if (res.status !== 206) {
      stop();
      throw new Error(`range not honoured (${res.status})`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length !== b - a + 1) {
      stop();
      throw new Error("short range");
    }
    return bytes;
  };
  try {
    return await load(from, sampleRate, range);
  } catch (e) {
    stop();
    throw e;
  } finally {
    signal?.removeEventListener("abort", stop);
  }
}

async function load(from: number, sampleRate: number, range: (a: number, b: number) => Promise<Uint8Array>) {
  const head = await range(0, HEAD - 1);
  const t = readTrack(head);
  if (!t || t.profile < 0) throw new Error("no audio index");
  const k0 = Math.max(0, Math.floor((from * t.timescale + t.mediaTime) / t.delta) - 2);
  // Byte ranges of the frames from k0 on, one per chunk (a chunk's frames sit together).
  const ranges: { a: number; b: number; frames: number[] }[] = [];
  let k = 0;
  for (const c of t.chunks) {
    let off = c.offset;
    const frames: number[] = [];
    let a = -1;
    for (let j = 0; j < c.count && k < t.sizes.length; j++, k++) {
      if (k >= k0) {
        if (a < 0) a = off;
        frames.push(t.sizes[k]);
      }
      off += t.sizes[k];
    }
    if (a >= 0) ranges.push({ a, b: off - 1, frames });
  }
  const parts = await Promise.all(ranges.map((r) => range(r.a, r.b)));
  // ADTS: each raw AAC frame behind a 7-byte header, so a decoder can read the stream on its own.
  const total = ranges.reduce((s, r) => s + r.frames.reduce((x, y) => x + y + 7, 0), 0);
  const adts = new Uint8Array(total);
  let w = 0;
  ranges.forEach((r, i) => {
    let p = 0;
    for (const size of r.frames) {
      const len = size + 7;
      adts.set([0xff, 0xf1, (t.profile << 6) | (t.freqIndex << 2) | (t.channels >> 2), ((t.channels & 3) << 6) | (len >> 11), (len >> 3) & 0xff, ((len & 7) << 5) | 0x1f, 0xfc], w);
      adts.set(parts[i].subarray(p, p + size), w + 7);
      w += len;
      p += size;
    }
  });
  const Offline =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const buf = await new Offline(2, 1, sampleRate).decodeAudioData(adts.buffer);
  const bytes = HEAD + ranges.reduce((s, r) => s + r.b - r.a + 1, 0);
  return { buf, t0: (k0 * t.delta - t.mediaTime) / t.timescale, bytes };
}
