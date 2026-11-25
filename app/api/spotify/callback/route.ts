import { connection, type NextRequest } from "next/server";
import { SPOTIFY_REDIRECT, STATE_COOKIE, notFound, setupEnabled } from "@/lib/spotify-setup";

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f0b0a;color:#f6efed;font:16px/1.5 system-ui,sans-serif}main{max-width:640px;padding:32px}h1{font-weight:400;font-size:28px;margin:0 0 12px}code{display:block;margin:16px 0;padding:14px;border:1px solid #3a302d;border-radius:8px;background:#1b1513;word-break:break-all;font:13px/1.5 ui-monospace,monospace}ol{padding-left:20px;color:#c4b7b4}</style></head><body><main>${body}</main></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
        // Clear the one-time state cookie.
        "Set-Cookie": `${STATE_COOKIE}=; Path=/api/spotify; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      },
    },
  );

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Spotify returns here. Verifies the state cookie set by /login, then shows the refresh token once. */
export async function GET(request: NextRequest) {
  // Always per request: the env can change after a build, and nothing here may be prerendered.
  await connection();
  if (!setupEnabled()) return notFound();

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) return notFound();

  const error = params.get("error");
  const code = params.get("code");
  if (error || !code) return page("Spotify setup", `<h1>Spotify didn't authorise it</h1><p>${escape(error ?? "No code returned.")}</p>`);

  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  let token: { refresh_token?: string; error_description?: string } = {};
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: SPOTIFY_REDIRECT }),
      cache: "no-store",
    });
    token = await res.json();
  } catch {
    return page("Spotify setup", "<h1>Couldn't reach Spotify</h1><p>Try the login link again.</p>");
  }
  if (!token.refresh_token) {
    return page("Spotify setup", `<h1>No refresh token</h1><p>${escape(token.error_description ?? "Spotify returned no token.")}</p>`);
  }

  return page(
    "Spotify connected",
    `<h1>Spotify connected</h1><p>Your refresh token (shown once, not stored anywhere):</p><code>${escape(token.refresh_token)}</code>
<ol><li>In Vercel, add it as <b>SPOTIFY_REFRESH_TOKEN</b> (Production).</li><li>Delete <b>SPOTIFY_SETUP_KEY</b> so these setup pages switch off.</li><li>Redeploy.</li></ol>`,
  );
}
