/**
 * Shared helpers for the Decap CMS GitHub OAuth flow
 * (functions/api/auth.ts → GitHub → functions/api/callback.ts).
 */

export interface Env {
  /** OAuth App client ID. */
  GITHUB_CLIENT_ID?: string;
  /** OAuth App client secret. Store as an encrypted secret, never in wrangler.toml. */
  GITHUB_CLIENT_SECRET?: string;
  /** OAuth scope: "public_repo" (default) for a public repo, "repo" for a private one. */
  GITHUB_SCOPE?: string;
}

export const PROVIDER = 'github';
export const STATE_COOKIE = 'decap_oauth_state';
/** How long the user has to finish the GitHub consent screen. */
export const STATE_TTL_SECONDS = 600;

/**
 * Origin of this deployment. Always https, except for local development
 * (`wrangler pages dev`), which only serves http.
 */
export function siteOrigin(request: Request): string {
  const url = new URL(request.url);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  return isLocal ? url.origin : `https://${url.host}`;
}

export function callbackUrl(request: Request): string {
  return `${siteOrigin(request)}/api/callback`;
}

export function stateCookie(value: string, maxAge: number): string {
  return `${STATE_COOKIE}=${value}; Path=/api; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

/** 32 random bytes, hex encoded. */
export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Length-safe, constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function textResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Serialize a value for safe embedding inside an inline <script>. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)) // line/paragraph separators end
    .join('\\u2028') //                    a line inside <script> in old engines
    .split(String.fromCharCode(0x2029))
    .join('\\u2029');
}

type Outcome = { status: 'success'; token: string } | { status: 'error'; message: string };

/**
 * The popup page for Decap's handshake:
 *   1. popup  → opener: "authorizing:github"
 *   2. opener → popup:  "authorizing:github" (the reply)
 *   3. popup  → opener: "authorization:github:<status>:<json>", sent to the
 *      reply's event.origin, then the popup closes.
 *
 * The result is only delivered when the reply comes from the window that opened
 * the popup *and* from this site's own origin (where /admin lives). Without that
 * check, any website could open /api/auth in a popup and, for a user who has
 * already authorized the OAuth app (GitHub then skips the consent screen),
 * receive their token.
 */
export function handshakePage(request: Request, outcome: Outcome, extraHeaders: HeadersInit = {}): Response {
  const content =
    outcome.status === 'success'
      ? { token: outcome.token, provider: PROVIDER }
      : { message: outcome.message };
  const message = `authorization:${PROVIDER}:${outcome.status}:${JSON.stringify(content)}`;
  const heading = outcome.status === 'success' ? 'Signed in' : 'Sign-in failed';
  const detail = outcome.status === 'success' ? 'You can close this window.' : outcome.message;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${heading} · Decap CMS</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:3rem auto;max-width:28rem;padding:0 1rem;color:#222}</style>
</head>
<body>
<h1 style="font-size:1.2rem">${heading}</h1>
<p id="detail"></p>
<script>
(function () {
  var message = ${scriptJson(message)};
  var expectedOrigin = ${scriptJson(siteOrigin(request))};
  var detail = document.getElementById('detail');
  detail.textContent = ${scriptJson(detail)};

  if (!window.opener) {
    detail.textContent = 'This window should be opened from the CMS at /admin. You can close it.';
    return;
  }

  function receive(event) {
    if (event.source !== window.opener || event.data !== ${scriptJson(`authorizing:${PROVIDER}`)}) return;
    window.removeEventListener('message', receive);
    if (event.origin !== expectedOrigin) {
      detail.textContent = 'Refusing to send credentials to ' + event.origin + '.';
      return;
    }
    window.opener.postMessage(message, event.origin);
    window.close();
  }

  window.addEventListener('message', receive, false);
  window.opener.postMessage(${scriptJson(`authorizing:${PROVIDER}`)}, '*');
})();
</script>
</body>
</html>`;

  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(html, { status: outcome.status === 'success' ? 200 : 400, headers });
}
