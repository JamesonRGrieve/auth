// SPDX-License-Identifier: AGPL-3.0-or-later
import type { NextRequest } from 'next/server';

/**
 * Read a required environment variable, throwing a descriptive error if it is
 * absent. Returns a guaranteed `string` so callers do not need to null-check.
 * The auth middleware relies on these vars being present at runtime; failing
 * fast here is preferable to a downstream `undefined.split(...)` crash.
 */
export const requireEnv = (name: string): string => {
  const value = process.env[name];
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

export const getRequestedURI = (req: NextRequest): string => {
  console.warn(`Processing: ${req.url}`);

  const appUri = process.env.APP_URI ?? '';
  const singleWordDomainRegex = /^[a-zA-Z\d-]+$/; // Match single word domains (no TLD)

  // Parse the URL
  const url = new URL(req.url);

  // Match the protocol, domain, and optional port
  const processedUrl = url.origin.replace(/https?:\/\/([a-zA-Z\d.-]+)(?::\d+)?/, (match: string, domain: string) => {
    // If the domain is a single word (like localhost or 0f86ff25b193), replace it with APP_URI
    if (singleWordDomainRegex.test(domain)) {
      // Remove trailing slash from appUri if it exists
      const cleanAppUri = appUri.replace(/\/$/, '');

      // Get the path without leading slash
      const path = url.pathname.replace(/^\//, '');

      // Check if the path is already included in the APP_URI
      if (cleanAppUri.endsWith(path)) {
        return cleanAppUri;
      }

      // Rebuild the URL with the APP_URI and path
      return `${cleanAppUri}/${path}`;
    }
    return match; // Return the match as is if the domain is not a single word
  });

  // Combine the processed URL with the original path and search params
  return `${processedUrl}${url.search}`;
};

export const getJWT = (req: NextRequest): string => {
  const rawJWT = req.cookies.get('jwt')?.value;
  // Strip any and all 'Bearer 's off of JWT.
  const parts = rawJWT !== undefined && rawJWT !== '' ? rawJWT.split(' ') : [];
  const jwt = parts.length > 0 ? (parts[parts.length - 1] ?? '') : (rawJWT ?? '');
  console.warn('JWT:', jwt);
  return jwt;
};
export const verifyJWT = async (jwt: string): Promise<Response> => {
  const appUri = process.env.APP_URI ?? '';
  const authEndpoint = `${appUri.includes('localhost') ? process.env.API_URI : process.env.SERVERSIDE_API_URI}/v1`;
  let response: Response;
  console.warn(`Verifying JWT Bearer ${jwt} with server at ${authEndpoint}...`);
  try {
    response = await fetch(authEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    });

    console.warn(`Successfully contacted server at ${authEndpoint}!`);
    return response;
  } catch (exception: unknown) {
    console.warn(`Failed to contact server at ${authEndpoint} - ${String(exception)}.`);
    return new Response();
  }
};
