/**
 * GET /api/auth — step 1 of Decap CMS's GitHub login.
 * Decap opens this in a popup (backend.base_url + backend.auth_endpoint);
 * we send the user to GitHub's consent screen with a CSRF state cookie.
 */
import {
  callbackUrl,
  PROVIDER,
  randomState,
  STATE_TTL_SECONDS,
  stateCookie,
  textResponse,
  type Env,
} from '../_lib/github-oauth';
import type { PagesFunction } from '../_lib/pages';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => {
  const provider = new URL(request.url).searchParams.get('provider');
  if (provider && provider !== PROVIDER) {
    return textResponse(400, `Unsupported provider "${provider}".`);
  }
  if (!env.GITHUB_CLIENT_ID) {
    return textResponse(500, 'OAuth is not configured: GITHUB_CLIENT_ID is missing.');
  }

  const state = randomState();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callbackUrl(request));
  authorize.searchParams.set('scope', env.GITHUB_SCOPE || 'public_repo');
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': stateCookie(state, STATE_TTL_SECONDS),
      'Cache-Control': 'no-store',
    },
  });
};
