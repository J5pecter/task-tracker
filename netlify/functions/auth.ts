import type { Handler, HandlerEvent } from '@netlify/functions';
import { env, json, redirect, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getAdminClient } from './_shared/supabaseAdmin';
import { encrypt } from './_shared/crypto';
import { exchangeCodeForTokens, getMe } from './_shared/graph';

/**
 * Microsoft Graph OAuth for Outlook access.
 *
 * The app account/identity is managed by Supabase Auth. This flow *links* a
 * Microsoft account to the currently signed-in Supabase user so we can read
 * their Outlook tasks/calendar. The refresh token is stored encrypted; the
 * browser never sees Microsoft secrets or tokens.
 *
 * Endpoints (single function, action-based):
 *   GET /auth?action=url        (Authorization: Bearer <supabase jwt>)
 *       -> { url } authorize URL to open. The Supabase JWT is carried in `state`.
 *   GET /auth?code=...&state=...  (Microsoft redirect target)
 *       -> exchanges code, stores encrypted refresh token, redirects to app.
 */
const handler: Handler = async (event: HandlerEvent) => {
  try {
    const params = event.queryStringParameters || {};

    // Step 1: build the authorize URL for the signed-in user.
    if (params.action === 'url') {
      const user = await authenticate(event);
      if (!user) return json(401, { error: 'Unauthorized' });

      const authorizeUrl =
        `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || 'common'}` +
        `/oauth2/v2.0/authorize?` +
        new URLSearchParams({
          client_id: env('MICROSOFT_CLIENT_ID'),
          response_type: 'code',
          redirect_uri: env('MICROSOFT_REDIRECT_URI'),
          response_mode: 'query',
          scope: env('MICROSOFT_SCOPES'),
          // Carry the Supabase JWT so the stateless callback can identify the user.
          // Transported over HTTPS; short-lived. See README security notes.
          state: user.accessToken,
        }).toString();

      return json(200, { url: authorizeUrl });
    }

    // Step 2: Microsoft redirect callback.
    if (params.code && params.state) {
      const appBase = env('APP_BASE_URL');

      // Identify the user from the state (their Supabase JWT).
      const admin = getAdminClient();
      const { data: userData, error: userErr } = await admin.auth.getUser(params.state);
      if (userErr || !userData.user) {
        return redirect(`${appBase}/settings?ms_error=invalid_state`);
      }
      const userId = userData.user.id;

      const tokens = await exchangeCodeForTokens(params.code);
      if (!tokens.refresh_token) {
        return redirect(`${appBase}/settings?ms_error=no_refresh_token`);
      }

      const me = await getMe(tokens.access_token);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await admin
        .from('user_profiles')
        .update({
          ms_user_id: me.id,
          ms_email: me.mail || me.userPrincipalName,
          ms_refresh_token_enc: encrypt(tokens.refresh_token),
          ms_token_expires_at: expiresAt,
        })
        .eq('id', userId);

      return redirect(`${appBase}/settings?ms_connected=1`);
    }

    if (params.error) {
      return redirect(`${env('APP_BASE_URL')}/settings?ms_error=${encodeURIComponent(params.error)}`);
    }

    return json(400, { error: 'Missing action or code parameter.' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('auth error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
