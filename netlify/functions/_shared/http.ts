// Small helpers for building consistent HTTP responses in Netlify Functions.

export interface FnResult {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function json(statusCode: number, data: unknown): FnResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(data) };
}

export function ok(data: unknown): FnResult {
  return json(200, data);
}

export function badRequest(message: string): FnResult {
  return json(400, { error: message });
}

export function unauthorized(message = 'Unauthorized'): FnResult {
  return json(401, { error: message });
}

export function notFound(message = 'Not found'): FnResult {
  return json(404, { error: message });
}

export function serverError(message = 'Internal server error'): FnResult {
  return json(500, { error: message });
}

export function redirect(location: string): FnResult {
  return { statusCode: 302, headers: { Location: location } };
}

/** Require an env var or throw a descriptive error (surfaced as a 500). */
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}
