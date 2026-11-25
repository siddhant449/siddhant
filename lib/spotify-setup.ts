import { timingSafeEqual } from "node:crypto";
import { site } from "@/lib/content";

/**
 * One-time Spotify setup on the live site (owner only).
 *
 * The routes under /api/spotify exist only while SPOTIFY_SETUP_KEY is set in
 * the environment; without it they return 404. Flow:
 *   1. Open /api/spotify/login?key=<SPOTIFY_SETUP_KEY>
 *   2. Approve on Spotify; it returns to /api/spotify/callback
 *   3. The callback shows the refresh token once. Save it as
 *      SPOTIFY_REFRESH_TOKEN, then remove SPOTIFY_SETUP_KEY and redeploy.
 */
export const SPOTIFY_REDIRECT = `${site.url}/api/spotify/callback`;
export const SPOTIFY_SCOPES = "user-read-recently-played user-read-currently-playing";
export const STATE_COOKIE = "sk_spotify_state";

export function setupEnabled() {
  return Boolean(process.env.SPOTIFY_SETUP_KEY && process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/** Constant-time comparison of a provided key with SPOTIFY_SETUP_KEY. */
export function keyMatches(given: string | null) {
  const expected = process.env.SPOTIFY_SETUP_KEY;
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
