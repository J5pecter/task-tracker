import { env } from './http';
import { getAdminClient } from './supabaseAdmin';
import { decrypt, encrypt } from './crypto';
import type {
  OutlookEvent,
  OutlookTask,
  OutlookTaskList,
} from '../../../src/types';

const TOKEN_URL = () =>
  `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || 'common'}/oauth2/v2.0/token`;
const GRAPH = 'https://graph.microsoft.com/v1.0';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/** Exchange an authorization code for tokens (initial login). */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: env('MICROSOFT_CLIENT_ID'),
    client_secret: env('MICROSOFT_CLIENT_SECRET'),
    code,
    redirect_uri: env('MICROSOFT_REDIRECT_URI'),
    grant_type: 'authorization_code',
    scope: env('MICROSOFT_SCOPES'),
  });
  const res = await fetch(TOKEN_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: env('MICROSOFT_CLIENT_ID'),
    client_secret: env('MICROSOFT_CLIENT_SECRET'),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: env('MICROSOFT_SCOPES'),
  });
  const res = await fetch(TOKEN_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export class GraphNotConnectedError extends Error {
  constructor() {
    super('Microsoft account not connected.');
    this.name = 'GraphNotConnectedError';
  }
}

/**
 * Returns a valid Graph access token for the given app user, refreshing
 * silently (and re-persisting the rotated refresh token) when expired.
 */
export async function getValidGraphToken(userId: string): Promise<string> {
  const admin = getAdminClient();
  const { data: profile, error } = await admin
    .from('user_profiles')
    .select('ms_refresh_token_enc, ms_token_expires_at')
    .eq('id', userId)
    .single();

  if (error || !profile?.ms_refresh_token_enc) throw new GraphNotConnectedError();

  const refreshToken = decrypt(profile.ms_refresh_token_enc);
  const tokens = await refreshTokens(refreshToken);

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  // Microsoft rotates refresh tokens re-persist the new one.
  await admin
    .from('user_profiles')
    .update({
      ms_refresh_token_enc: tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : profile.ms_refresh_token_enc,
      ms_token_expires_at: expiresAt,
    })
    .eq('id', userId);

  return tokens.access_token;
}

async function graphFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph GET ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

interface GraphList<T> {
  value: T[];
}

export async function getMe(token: string): Promise<{ id: string; mail: string; userPrincipalName: string; displayName: string }> {
  return graphFetch(token, '/me');
}

export async function listTodoLists(token: string): Promise<OutlookTaskList[]> {
  const data = await graphFetch<GraphList<{ id: string; displayName: string }>>(
    token,
    '/me/todo/lists',
  );
  return data.value.map((l) => ({ id: l.id, displayName: l.displayName }));
}

interface RawTodoTask {
  id: string;
  title: string;
  status: OutlookTask['status'];
  importance: OutlookTask['importance'];
  body?: { content: string };
  dueDateTime?: { dateTime: string } | null;
  createdDateTime?: string;
}

export async function listTodoTasks(token: string, listId: string): Promise<OutlookTask[]> {
  const data = await graphFetch<GraphList<RawTodoTask>>(
    token,
    `/me/todo/lists/${encodeURIComponent(listId)}/tasks?$top=100`,
  );
  return data.value.map((t) => ({
    id: t.id,
    listId,
    title: t.title,
    status: t.status,
    importance: t.importance,
    body: t.body?.content,
    dueDateTime: t.dueDateTime?.dateTime ?? null,
    createdDateTime: t.createdDateTime,
  }));
}

interface RawEvent {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  isAllDay: boolean;
  location?: { displayName?: string };
  webLink?: string;
}

export async function listEvents(
  token: string,
  startIso: string,
  endIso: string,
): Promise<OutlookEvent[]> {
  const data = await graphFetch<GraphList<RawEvent>>(
    token,
    `/me/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(
      endIso,
    )}&$top=100&$orderby=start/dateTime`,
  );
  return data.value.map((e) => ({
    id: e.id,
    subject: e.subject,
    start: e.start.dateTime,
    end: e.end.dateTime,
    isAllDay: e.isAllDay,
    location: e.location?.displayName,
    webLink: e.webLink,
  }));
}
