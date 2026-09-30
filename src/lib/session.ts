// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser sessions are HttpOnly cookies the server sets on login (zx_session, the JWT, which
// scripts can't read) plus a readable double-submit token (zx_csrf). Requests reach the API on
// the app's own origin, so the browser attaches the session itself: send no Authorization
// header (it would take precedence over the cookie), and echo zx_csrf as X-CSRF-Token on every
// request that can change state. See server-framework ba593ef5.
import { getCookie } from 'cookies-next/client';

export const SESSION_COOKIE = 'zx_session';
export const CSRF_COOKIE = 'zx_csrf';
export const CSRF_HEADER = 'X-CSRF-Token';

/** Credentials mode for session requests: the API is same-origin, so cookies travel with it. */
export const SESSION_CREDENTIALS: RequestCredentials = 'same-origin';

const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

const csrfToken = (): string | null => {
  const token = getCookie(CSRF_COOKIE);
  return typeof token === 'string' && token !== '' ? token : null;
};

/**
 * Whether this browser holds a session. The session cookie itself is HttpOnly; the readable CSRF
 * cookie the server sets beside it is the signal. Use it to skip requests that need a session
 * (they would only 401) for signed-out visitors.
 */
export function hasSession(): boolean {
  return csrfToken() !== null;
}

/** The CSRF header a cookie-authenticated `method` needs; empty for safe methods or with no session. */
export function csrfHeaders(method: string): Record<string, string> {
  if (SAFE_METHODS.has(method.toUpperCase())) {
    return {};
  }
  const token = csrfToken();
  return token === null ? {} : { [CSRF_HEADER]: token };
}
