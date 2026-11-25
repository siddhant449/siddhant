/**
 * Server-side "last played" from Spotify for the footer's Listening & Reading widget.
 *
 * Needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN (scripts/spotify-token.mjs
 * prints the refresh token). None of them are NEXT_PUBLIC_, so they never reach the browser, and this
 * module is only imported by server components. It never throws: missing env or any failure returns null.
 *
 * Cached with Cache Components for ~5 minutes: `revalidate: 300` refreshes in the background, and an
 * `expire` of an hour keeps it eligible for the prerendered shell (expire must be ≥ 5 minutes for that).
 */
import { cacheLife } from "next/cache";

export type LastPlayed = { track: string; artist: string; albumArt: string | null; url: string };

type SpotifyImage = { url: string; width: number | null };
type SpotifyTrack = {
  type?: string;
  name: string;
  artists: { name: string }[];
  album: { images: SpotifyImage[] };
  external_urls: { spotify: string };
};

const TIMEOUT = 4000;

function pick(t: SpotifyTrack | null | undefined): LastPlayed | null {
  if (!t || !t.name || !t.external_urls?.spotify) return null;
  // the ~300px rendition is plenty for a 104px cover at 2x
  const imgs = [...(t.album?.images ?? [])].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const art = imgs.find((i) => (i.width ?? 0) >= 240) ?? imgs[imgs.length - 1];
  return {
    track: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    albumArt: art?.url ?? null,
    url: t.external_urls.spotify,
  };
}

async function accessToken(id: string, secret: string, refresh: string) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function getLastPlayed(): Promise<LastPlayed | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!id || !secret || !refresh) return null;

  try {
    const token = await accessToken(id, secret, refresh);
    if (!token) return null;
    const headers = { Authorization: `Bearer ${token}` };

    // What's on now, if anything (204 when nothing is playing)
    const now = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers, signal: AbortSignal.timeout(TIMEOUT) });
    if (now.status === 200) {
      const body = (await now.json()) as { item?: SpotifyTrack | null; currently_playing_type?: string };
      if (body.currently_playing_type === "track") {
        const hit = pick(body.item);
        if (hit) return hit;
      }
    }

    const recent = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers, signal: AbortSignal.timeout(TIMEOUT) });
    if (!recent.ok) return null;
    const body = (await recent.json()) as { items?: { track: SpotifyTrack }[] };
    return pick(body.items?.[0]?.track);
  } catch {
    return null;
  }
}
