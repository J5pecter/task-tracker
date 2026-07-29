import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './http';

let _admin: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — use only in server-side functions and
 * always after verifying the caller's identity. Never send this key to the client.
 */
export function getAdminClient(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

/**
 * Per-request client scoped to the caller's JWT. Queries run under the user's
 * RLS policies — the safest default for CRUD on user-owned data.
 */
export function getUserClient(accessToken: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
