import type { HandlerEvent } from '@netlify/functions';
import { getAdminClient } from './supabaseAdmin';

export interface AuthedUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Extract and verify the Supabase JWT from the Authorization header.
 * Returns null if missing/invalid; callers should respond 401.
 */
export async function authenticate(event: HandlerEvent): Promise<AuthedUser | null> {
  const header = event.headers.authorization || event.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    accessToken: token,
  };
}
