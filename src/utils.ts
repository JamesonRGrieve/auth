// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextRequest } from 'next/server.js';
import log from './lib/log';

/**
 * Read a required environment variable, throwing a descriptive error if it is
 * absent. Returns a guaranteed `string` so callers do not need to null-check.
 * The auth middleware relies on these vars being present at runtime; failing
 * fast here is preferable to a downstream `undefined.split(...)` crash.
 */
export const requireEnv = (name: string): string => {
  const value = new Map(Object.entries(process.env)).get(name);
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const AuthMode = {
  None: 0,
  GTAuth: 1,
  MagicalAuth: 2,
};
export const getAuthMode = (): number => {
  let authMode = AuthMode.None;
  const authUri = process.env.NEXT_PUBLIC_AUTH_URI;
  const apiUri = process.env.NEXT_PUBLIC_API_URI;
  const appUri = process.env.APP_URI;
  if (authUri !== undefined && authUri !== '' && apiUri !== undefined && apiUri !== '') {
    if (appUri !== undefined && appUri !== '' && authUri.startsWith(appUri)) {
      authMode = AuthMode.MagicalAuth;
      if (!authUri.endsWith('/user')) {
        throw new Error('Invalid AUTH_URI. For Magical Auth implementations, AUTH_URI must point to APP_URI/user.');
      }
    } else {
      authMode = AuthMode.GTAuth;
    }
  }
  return authMode;
};
/** cookies-next options that scope a cookie to NEXT_PUBLIC_COOKIE_DOMAIN when one is configured. */
export const cookieDomainOptions = (): { domain?: string } => {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  return domain !== undefined && domain !== '' ? { domain } : {};
};

export const generateCookieString = (key: string, value: string, age: string): string =>
  `${key}=${value}; Domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN}; Path=/; Max-Age=${age}; SameSite=strict;`;

/**
 * Build a `Headers` object carrying one or more `Set-Cookie` headers. The web
 * `Headers` API is the correct way to emit multiple Set-Cookie values; passing
 * a `string[]` via a plain `HeadersInit` literal is not type-safe (and Next's
 * `HeadersInit` rejects it). `Headers.append` preserves every cookie.
 */
export const cookieHeaders = (cookies: string[]): Headers => {
  const headers = new Headers();
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
  return headers;
};

export const getQueryParams = (req: NextRequest): Record<string, string | undefined> =>
  req.url.includes('?')
    ? (Object.assign(
        {},
        ...(req.url.split('?')[1] ?? '').split('&').map((param) => ({ [param.split('=')[0] ?? '']: param.split('=')[1] })),
      ) as Record<string, string | undefined>)
    : {};

const SINGLE_LABEL_HOST = /^[\dA-Za-z-]+$/;

export const getRequestedURI = (req: NextRequest): string => {
  log([`Processing: ${req.url}`], { server: 3 });

  const url = new URL(req.url);
  // A single-label host (localhost, a container id) is an internal address; the public
  // address is APP_URI, which may already carry the requested path.
  if (!SINGLE_LABEL_HOST.test(url.hostname)) {
    return `${url.origin}${url.search}`;
  }
  const cleanAppUri = (process.env.APP_URI ?? '').replace(/\/$/, '');
  const path = url.pathname.replace(/^\//, '');
  const base = cleanAppUri.endsWith(path) ? cleanAppUri : `${cleanAppUri}/${path}`;
  return `${base}${url.search}`;
};

export const getJWT = (req: NextRequest): string => {
  const rawJWT = req.cookies.get('jwt')?.value;
  // Strip any and all 'Bearer 's off of JWT.
  const parts = rawJWT !== undefined && rawJWT !== '' ? rawJWT.split(' ') : [];
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : (rawJWT ?? '');
};

const BAD_GATEWAY = 502;

/**
 * Ask the auth server whether `jwt` is valid. An unreachable server is reported as 502
 * (Bad Gateway), which the middleware routes to the "down" page; it must never look like
 * a successful verification. The token itself is never logged.
 */
export const verifyJWT = async (jwt: string): Promise<Response> => {
  const appUri = process.env.APP_URI ?? '';
  const authEndpoint = `${appUri.includes('localhost') ? process.env.API_URI : process.env.SERVERSIDE_API_URI}/v1`;
  try {
    return await fetch(authEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    });
  } catch (exception: unknown) {
    console.error(`Failed to contact auth server at ${authEndpoint}: ${String(exception)}`);
    return new Response(null, { status: BAD_GATEWAY });
  }
};
