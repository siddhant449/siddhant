# Siddhant Kotak — portfolio

A scroll-driven film in six scenes, scored by three songs. A chrome WebGL title over the ledge photograph opens
it; the light of the pillar turns into a pitch set in dots; the web work plays as reels; the engineering work
runs as live, playable systems; a record change hands the music over; and the portrait burns to the beat.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## The film

| Scene | What it is | Song |
| --- | --- | --- |
| SC.01 Cold open | The chrome `SIDDHANT` title over the photograph; the camera pushes into the pillar of light | All the Things She Said |
| SC.02 The pitch | The pillar's light breaks into dots that spell the pitch, layer by layer: interface, systems, AI, cloud | All the Things She Said |
| SC.03 A-side | "Work it" lands on the line, then the client sites as reels and an exploded anatomy | Harder Better Faster Stronger |
| SC.04 B-side | Engineering: a playable clinical messaging machine, Shizuku's manga page, other builds | Harder Better Faster Stronger |
| SC.05 Record change | The record brakes, the tonearm lifts, the next record drops on the song's intro | Live Your Life |
| SC.06 Credits | The portrait as a Doom-style fire fed by the music, the call sheet, the end card and footer | Live Your Life |

The songs are Apple Music 30-second previews, streamed from Apple and refreshed daily through the iTunes lookup
API. Nothing is stored in this repository.

## Where things live

| Path | What it is |
| --- | --- |
| `lib/content.ts` | All copy: the A-side case studies, the B-side projects, the call sheet, the timeline |
| `lib/tracks.ts` | The three songs: preview ids, beat grids, keys, loops and landmarks (`FALLBACK`) |
| `lib/audio.ts` | The two-deck director: decoded previews, DJ handovers (echo out, loop roll, brake, spinback, cuts on the bar) on the Web Audio clock, one song at a time, always |
| `lib/introAudio.ts` | Live Your Life's intro, read from Apple's music-video preview with range requests (audio frames only) |
| `lib/cues.ts` | Which scene is active and which song it cues; the scene list the rail and the footer read |
| `lib/hold.ts`, `lib/lyrics.ts` | Lyric moments: word timings, and the soft hold that lands the page on a sung line |
| `components/hero/` | React Three Fiber hero: photo backdrop shader, arc-bent chrome title, the exit into the light |
| `components/scenes/` | The pitch (`Switch.tsx`, a dot field that sets type) and the record change |
| `components/work/` | The A-side reels, screens and anatomy |
| `components/bside/` | The B-side, with the messaging machine in `anatomy/` |
| `components/dither/` | The dot-screen renderer; `DitherCanvas.tsx` holds the portrait's Doom fire |
| `components/credits/` | The call sheet, the end card and the footer |
| `app/globals.css` | Tokens, grid and shared layout |

## Changing things

- **Swap a song:** find its `trackId` with `https://itunes.apple.com/search?term=artist+song&entity=song`, then
  replace its entry in `FALLBACK` in `lib/tracks.ts`. Its beat grid (`bpm`, `downbeat`) and loops must be
  measured on the new preview, or the handovers and lyrics will drift.
- **Add a web project:** add an entry to `aSide` in `lib/content.ts` with its frames in `public/img/work/`.
- **Change the hero word:** edit `word="SIDDHANT"` in `components/Hero.tsx`. The 3D font only contains A–Z;
  for other glyphs edit `keep` in `scripts/build-font.mjs` and run `node scripts/build-font.mjs`.

Stack: Next.js 16, React 19, three.js / React Three Fiber / postprocessing, Motion, Lenis, Web Audio.
Type: Archivo.
