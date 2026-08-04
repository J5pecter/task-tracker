import type { Handler, HandlerEvent } from '@netlify/functions';
import { json, serverError } from './_shared/http';
import { authenticate } from './_shared/auth';
import { getAdminClient } from './_shared/supabaseAdmin';
import { method, parseBody } from './_shared/crud';

/**
 * Admin-controlled user management. There is NO public sign-up: an admin (an
 * email listed in ADMIN_EMAILS) provisions accounts here, and those users log
 * in normally. Accounts are created already-confirmed, so no email is ever sent.
 *
 *   GET    /admin-users                 -> list users
 *   POST   /admin-users  {email,password,full_name?}  -> create a confirmed user
 *   DELETE /admin-users?id=<uid>        -> delete a user
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const handler: Handler = async (event: HandlerEvent) => {
  const user = await authenticate(event);
  if (!user) return json(401, { error: 'Unauthorized' });

  const admins = adminEmails();
  if (admins.length === 0) {
    return json(500, { error: 'No ADMIN_EMAILS configured on the server.' });
  }
  if (!admins.includes(user.email.toLowerCase())) {
    return json(403, { error: 'Admins only.' });
  }

  const admin = getAdminClient();
  const q = event.queryStringParameters || {};
  const m = method(event);

  try {
    if (m === 'GET') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) throw error;
      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: (u.user_metadata as { full_name?: string })?.full_name ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        is_admin: admins.includes((u.email || '').toLowerCase()),
      }));
      return json(200, { users });
    }

    if (m === 'POST') {
      const { email, password, full_name } = parseBody<{
        email: string;
        password: string;
        full_name?: string;
      }>(event);
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) return json(400, { error: 'Email and password are required.' });
      if (password.length < 6) return json(400, { error: 'Password must be at least 6 characters.' });

      const { data, error } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true, // ready to sign in immediately, no confirmation email
        user_metadata: { full_name: full_name?.trim() || cleanEmail },
      });
      if (error) throw error;
      if (!data.user) throw new Error('User was not created.');
      return json(201, { user: { id: data.user.id, email: data.user.email } });
    }

    if (m === 'DELETE') {
      if (!q.id) return json(400, { error: 'id required' });
      // Never let an admin delete themselves out of access.
      if (q.id === user.id) return json(400, { error: 'You cannot delete your own account.' });
      const { error } = await admin.auth.admin.deleteUser(q.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('admin-users error', err);
    return serverError((err as Error).message);
  }
};

export { handler };
