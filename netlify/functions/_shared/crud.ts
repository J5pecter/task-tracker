import type { HandlerEvent } from '@netlify/functions';

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export function parseBody<T = Record<string, unknown>>(event: HandlerEvent): T {
  if (!event.body) return {} as T;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    return {} as T;
  }
}

export function method(event: HandlerEvent): Method {
  return (event.httpMethod || 'GET').toUpperCase() as Method;
}
