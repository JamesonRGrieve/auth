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
   * Path prefixes that need a signed-in user, including any auth pages the app adds that do (e.g.
   * approving a device pairing). The account page (`<authPath>/manage`) always does.
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

/**
 * Whether the person asked for this page themselves: a document navigation (a link opened, an address
 * typed, a redirect followed). A browser marks it `Sec-Fetch-Mode: navigate`; its prefetches and the
 * app's own client-side fetches carry `cors`, `no-cors` or `same-origin` instead. A client that sends
 * no Sec-Fetch headers at all (an older browser, a script) counts as navigating. Next's flight headers
 * (`rsc`, `next-router-prefetch`, …) can't tell this: Next deletes them before middleware runs
 * (`next/dist/server/web/adapter.js`), which is why reading them didn't work (Zephyreader, 2026-11-21).
 */
const isDocumentNavigation = (req: NextRequest): boolean => {
  const mode = req.headers.get('sec-fetch-mode');
  const purpose = `${req.headers.get('purpose') ?? ''} ${req.headers.get('sec-purpose') ?? ''}`;
  return (mode === null || mode === 'navigate') && !purpose.includes('prefetch');
};

/**
 * Remembers the page a signed-out visitor asked for, to return to after signing in, and only when
 * they asked for it: a signed-out sidebar listing private pages had its links prefetched, so the
 * cookie held the last one prefetched (a visitor reading the privacy page signed in and landed on
 * Settings). A signed-out client-side click on a private link isn't remembered either; sign-in then
 * goes to the app's home, which is the lesser surprise.
 */
const rememberReturn = (req: NextRequest, response: NextResponse): NextResponse => {
  if (!isDocumentNavigation(req)) {
    return response;
  }
  response.cookies.set(RETURN_COOKIE, `${req.nextUrl.pathname}${req.nextUrl.search}`, {
    path: '/',
    maxAge: DAY_SECONDS,
    sameSite: 'lax',
  });
  return response;
};

/**
 * An invite link (`?code=…&email=…`). Someone already signed in goes straight to the account
 * page, which lists the invitation to answer (an expired session is sent through sign-in from
 * there). Anyone else has it remembered and starts at the auth pages: a new user registers with
 * the code, and a returning user signs in and lands on the account page.
 */
const acceptInviteLink = (req: NextRequest, authPath: string, managePath: string): NextResponse | null => {
  const code = req.nextUrl.searchParams.get('code');
  const email = req.nextUrl.searchParams.get('email');
  if (code === null || code === '' || email === null || email === '') {
    return null;
  }
  if ((req.cookies.get(SESSION_COOKIE)?.value ?? '') !== '') {
    return redirect(req, managePath);
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

/**
 * The pages that ask a person to sign in: the welcome page, sign-in and register (the router's
 * default paths). Someone already signed in is sent on to their account rather than shown a form.
 */
const SIGN_IN_PAGES = ['', '/', '/login', '/register'];

/** The Next middleware hook that guards private pages and the account page on the session cookie. */
export function createAuthMiddleware({
  authPath,
  apiBase,
  privateRoutes,
  landingOnly = false,
}: AuthMiddlewareOptions): MiddlewareHook {
  const managePath = `${authPath}/manage`;
  const alwaysPrivate = [managePath];
  const api = apiBase.replace(/\/$/, '');
  const signInPages = new Set(SIGN_IN_PAGES.map((page) => `${authPath}${page}`));
  return async (req) => {
    const { pathname } = req.nextUrl;
    if (landingOnly && pathname !== '/') {
      return { activated: true, response: redirect(req, '/') };
    }
    const invite = acceptInviteLink(req, authPath, managePath);
    if (invite !== null) {
      return { activated: true, response: invite };
    }
    const session = req.cookies.get(SESSION_COOKIE)?.value;
    const hasSession = session !== undefined && session !== '';
    // Only a session the API still accepts moves on: with an expired one the form stays, so the
    // account page and the sign-in page never send a person back and forth.
    if (signInPages.has(pathname)) {
      return hasSession && (await sessionStatus(api, session)) === HTTP_OK
        ? { activated: true, response: redirect(req, managePath) }
        : pass();
    }
    const needsSession = [...alwaysPrivate, ...privateRoutes].some((route) => pathname.startsWith(route));
    if (!needsSession) {
      return pass();
    }
    if (!hasSession) {
      return { activated: true, response: rememberReturn(req, redirect(req, authPath)) };
    }
    const status = await sessionStatus(api, session);
    if (status === HTTP_OK) {
      return pass();
    }
    if (status === HTTP_PAYMENT_REQUIRED) {
      // The app mounts its subscribe page there (in Zephyrex, @zephyrex/payment's).
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
