import { randomBytes } from "node:crypto";
import { connection, type NextRequest } from "next/server";
import { SPOTIFY_REDIRECT, SPOTIFY_SCOPES, STATE_COOKIE, keyMatches, notFound, setupEnabled } from "@/lib/spotify-setup";

/** Starts the one-time Spotify authorisation. Needs ?key=<SPOTIFY_SETUP_KEY>; otherwise 404. */
export async function GET(request: NextRequest) {
  // Always per request: the env can change after a build, and nothing here may be prerendered.
  await connection();
  if (!setupEnabled() || !keyMatches(request.nextUrl.searchParams.get("key"))) return notFound();

  const state = randomBytes(16).toString("hex");
  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.search = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT,
    scope: SPOTIFY_SCOPES,
    state,
  }).toString();

  const res = new Response(null, { status: 302, headers: { Location: authorize.toString(), "Cache-Control": "no-store" } });
  res.headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=${state}; Path=/api/spotify; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
  );
  return res;
}
