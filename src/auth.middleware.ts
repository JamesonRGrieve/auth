// SPDX-License-Identifier: AGPL-3.0-or-later
// Route guarding for Next middleware, on HttpOnly cookie sessions. The browser sends zx_session
// with every request to the app's own origin; this checks it against the API before a private
// page renders. Nothing here reads process.env: the app passes its configuration in.
import { type NextRequest, NextResponse } from 'next/server.js';
import { SESSION_COOKIE } from './lib/session';

export interface MiddlewareResult {
  activated: boolean;
  response: NextResponse;
}

export type MiddlewareHook = (req: NextRequest) => Promise<MiddlewareResult>;

export interface AuthMiddlewareOptions {
  /** Where the auth pages live on the app's origin, e.g. `/user`. */
  authPath: string;
  /**
   * Where the Next server reaches the API (absolute), to check a session. It is fixed configuration,
   * never derived from the request: the Host header is the client's to choose, and the check sends
   * the session cookie along.
   */
  apiBase: string;
  /**
   * Path prefixes that need a signed-in user. The account page (`<authPath>/manage`) and device
   * pairing approval (`<authPath>/pair/approve`) always do; asking to be paired (`<authPath>/pair`)
   * is for a device that is not signed in yet.
   */
  privateRoutes: readonly string[];
  /** Serve only `/`, sending every other path there (a pre-launch landing page). */
  landingOnly?: boolean;
}

const DAY_SECONDS = 86400;
const HTTP_OK = 200;
const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_FORBIDDEN = 403;
const HTTP_SERVER_ERROR = 500;

/** Where to return after signing in: the requested path on this origin, never an absolute URL. */
const RETURN_COOKIE = 'href';

const pass = (): MiddlewareResult => ({ activated: false, response: NextResponse.next() });

const redirect = (req: NextRequest, path: string): NextResponse => NextResponse.redirect(new URL(path, req.url));

const rememberReturn = (req: NextRequest, response: NextResponse): NextResponse => {
  response.cookies.set(RETURN_COOKIE, `${req.nextUrl.pathname}${req.nextUrl.search}`, {
    path: '/',
    maxAge: DAY_SECONDS,
    sameSite: 'lax',
  });
  return response;
};

/**
 * An invite link (`?code=…&email=…`) remembers the invitation for registration or sign-in,
 * then starts at the auth pages: a new user registers with the code, and a signed-in user
 * answers it on the account page.
 */
const acceptInviteLink = (req: NextRequest, authPath: string): NextResponse | null => {
  const code = req.nextUrl.searchParams.get('code');
  const email = req.nextUrl.searchParams.get('email');
  if (code === null || code === '' || email === null || email === '') {
    return null;
  }
  const response = redirect(req, authPath);
  const cookie = { path: '/', maxAge: DAY_SECONDS, sameSite: 'lax' as const };
  response.cookies.set('invitation', code, cookie);
  response.cookies.set('email', email.toLowerCase(), cookie);
  const team = req.nextUrl.searchParams.get('team');
  if (team !== null && team !== '') {
    response.cookies.set('team', team, cookie);
  }
  return response;
};

/** GET /v1/user with the request's session cookie; a network failure reads as a server error. */
const sessionStatus = async (apiBase: string, session: string): Promise<number> => {
  try {
    const response = await fetch(`${apiBase}/v1/user`, {
      headers: { Cookie: `${SESSION_COOKIE}=${session}` },
      cache: 'no-store',
    });
    return response.status;
  } catch {
    return HTTP_SERVER_ERROR;
  }
};

/** The Next middleware hook that guards private pages and the account page on the session cookie. */
export function createAuthMiddleware({
  authPath,
  apiBase,
  privateRoutes,
  landingOnly = false,
}: AuthMiddlewareOptions): MiddlewareHook {
  const managePath = `${authPath}/manage`;
  // Approving a device pairing signs another device in as the user, so it always needs a session.
  const alwaysPrivate = [managePath, `${authPath}/pair/approve`];
  return async (req) => {
    const { pathname } = req.nextUrl;
    if (landingOnly && pathname !== '/') {
      return { activated: true, response: redirect(req, '/') };
    }
    const invite = acceptInviteLink(req, authPath);
    if (invite !== null) {
      return { activated: true, response: invite };
    }
    const needsSession = [...alwaysPrivate, ...privateRoutes].some((route) => pathname.startsWith(route));
    if (!needsSession) {
      return pass();
    }
    const session = req.cookies.get(SESSION_COOKIE)?.value;
    if (session === undefined || session === '') {
      return { activated: true, response: rememberReturn(req, redirect(req, authPath)) };
    }
    const status = await sessionStatus(apiBase.replace(/\/$/, ''), session);
    if (status === HTTP_OK) {
      return pass();
    }
    if (status === HTTP_PAYMENT_REQUIRED) {
      return { activated: true, response: redirect(req, `${authPath}/subscribe`) };
    }
    if (status === HTTP_FORBIDDEN) {
      return pathname.startsWith(managePath) ? pass() : { activated: true, response: redirect(req, managePath) };
    }
    if (status >= HTTP_SERVER_ERROR) {
      return { activated: true, response: rememberReturn(req, redirect(req, '/down')) };
    }
    return { activated: true, response: rememberReturn(req, redirect(req, authPath)) };
  };
}
