/**
 * GET /api/callback — step 2 of Decap CMS's GitHub login.
 * GitHub redirects here with ?code&state. We check the state against the
 * cookie set by /api/auth, exchange the code for a token, and hand the result
 * to the CMS window via Decap's postMessage handshake.
 */
import {
  callbackUrl,
  handshakePage,
  readCookie,
  safeEqual,
  STATE_COOKIE,
  stateCookie,
  type Env,
} from '../_lib/github-oauth';
import type { PagesFunction } from '../_lib/pages';

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  // The state is single-use: clear the cookie whatever happens next.
  const clearState = { 'Set-Cookie': stateCookie('', 0) };
  const fail = (message: string) => handshakePage(request, { status: 'error', message }, clearState);

  const params = new URL(request.url).searchParams;

  // The user declined, or GitHub rejected the request.
  const githubError = params.get('error');
  if (githubError) {
    return fail(params.get('error_description') || githubError);
  }

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = readCookie(request, STATE_COOKIE);
  if (!code || !state) {
    return fail('Missing code or state in the GitHub callback.');
  }
  if (!expectedState || !safeEqual(state, expectedState)) {
    return fail('Login session expired or state mismatch. Close this window and try again.');
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return fail('OAuth is not configured: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing.');
  }

  let result: GitHubTokenResponse;
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'decap-cms-oauth (Cloudflare Pages Functions)',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl(request),
      }),
    });
    // GitHub usually reports problems as JSON (even on non-2xx), so prefer its message.
    result = ((await response.json().catch(() => ({}))) ?? {}) as GitHubTokenResponse;
    if (!response.ok && !result.error) {
      return fail(`GitHub token exchange failed (HTTP ${response.status}).`);
    }
  } catch {
    return fail('Could not reach GitHub to complete sign-in.');
  }

  if (!result.access_token) {
    const reason = result.error_description || result.error;
    return fail(reason ? `GitHub: ${reason}` : 'GitHub did not return an access token.');
  }

  return handshakePage(request, { status: 'success', token: result.access_token }, clearState);
};
