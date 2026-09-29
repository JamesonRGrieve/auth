// SPDX-License-Identifier: AGPL-3.0-or-later
import axios, { type AxiosError } from 'axios';
import { type NextRequest, NextResponse } from 'next/server.js';
import {
  AuthMode,
  generateCookieString,
  getAuthMode,
  getJWT,
  getQueryParams,
  getRequestedURI,
  cookieHeaders,
  requireEnv,
  verifyJWT,
} from './utils';

export type MiddlewareHook = (req: NextRequest) => Promise<{
  activated: boolean;
  response: NextResponse;
}>;

type AuthOutcome = {
  activated: boolean;
  response: NextResponse;
};

type MiddlewareResponseJSON = {
  detail?: { customer_session?: { client_secret?: string } } & Record<string, unknown>;
  missing_requirements?: Record<string, unknown>;
};

/**
 * Map a verified-JWT upstream response onto a redirect guard clause. Returns an
 * outcome to apply when a guard trips, or `null` when the JWT is valid and no
 * redirect is required. Extracted from `useAuth` to keep its complexity in check.
 */
const resolveVerifiedJWTOutcome = (params: {
  status: number;
  responseJSON: MiddlewareResponseJSON;
  requestedURI: string;
  authUri: string;
  authMode: number;
  jwt: string;
  pathname: string;
  reqUrl: string;
}): AuthOutcome | { throwSetCookie: true } | null => {
  const { status, responseJSON, requestedURI, authUri, authMode, jwt, pathname, reqUrl } = params;
  const authBase = process.env.AUTH_URI;
  if (status === 402) {
    if (requestedURI.startsWith(`${authBase}/subscribe`)) {
      return null;
    }
    const clientSecret = responseJSON.detail?.customer_session?.client_secret;
    const sessionSuffix = clientSecret !== undefined && clientSecret !== '' ? `?customer_session=${clientSecret}` : '';
    return { activated: true, response: NextResponse.redirect(new URL(`${authBase}/subscribe${sessionSuffix}`)) };
  }
  if (responseJSON.missing_requirements !== undefined || status === 403) {
    if (requestedURI.startsWith(`${authBase}/manage`)) {
      return null;
    }
    return { activated: true, response: NextResponse.redirect(new URL(`${authBase}/manage`)) };
  }
  if (status === 502) {
    const cookieArray = [generateCookieString('href', requestedURI, (86400).toString())];
    return {
      activated: true,
      response: NextResponse.redirect(new URL(`${authBase}/down`, reqUrl), {
        headers: cookieHeaders(cookieArray),
      }),
    };
  }
  if (status >= 500 && status < 600) {
    console.error(
      `Invalid token response, status ${status}, detail ${JSON.stringify(responseJSON.detail)}. Server error, please try again later.`,
    );
    return { activated: true, response: NextResponse.redirect(new URL(`${authBase}/error`, reqUrl)) };
  }
  if (status !== 204) {
    return { throwSetCookie: true };
  }
  if (
    authMode === AuthMode.MagicalAuth &&
    requestedURI.startsWith(authUri) &&
    jwt.length > 0 &&
    !['/user/manage'].includes(pathname)
  ) {
    return { activated: true, response: NextResponse.redirect(new URL(`${authBase}/manage`)) };
  }
  return null;
};

/**
 * Handle an inbound invite link (email + code present). Creates the user (or
 * detects an existing one via 409) and returns the redirect response with the
 * invite cookies attached. Extracted from `useAuth` to keep its complexity low.
 */
const handleInviteRegistration = async (queryParams: Record<string, string | undefined>): Promise<NextResponse> => {
  const email = queryParams['email'] ?? '';
  const code = queryParams['code'] ?? '';
  console.warn(
    `DETECTED INVITE - ${process.env.AUTH_URI}/register - SETTINGS COOKIES ${email} ${code} ${queryParams['team_id']}`,
  );
  const cookieArray = [
    generateCookieString('email', email, (86400).toString().toLowerCase()),
    generateCookieString('invitation', code, (86400).toString()),
    generateCookieString('team', (queryParams['team'] ?? '').replaceAll('+', ' '), (86400).toString()),
  ];
  if (queryParams['company'] !== undefined && queryParams['company'] !== '') {
    cookieArray.push(generateCookieString('team_id', queryParams['team_id'] ?? '', (86400).toString()));
  }

  try {
    await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/v1/user`, {
      user: { email: decodeURIComponent(email) },
    });
    // User doesn't exist yet — send them to register.
    return NextResponse.redirect(`${process.env.AUTH_URI}/register`, { headers: cookieHeaders(cookieArray) });
  } catch (exception: unknown) {
    const axiosError = exception as AxiosError;
    const target = axiosError.response?.status === 409 ? 'login' : 'register';
    return NextResponse.redirect(`${process.env.AUTH_URI}/${target}`, { headers: cookieHeaders(cookieArray) });
  }
};

/** Log a verify-JWT failure, expanding aggregate causes for diagnostics. */
const logJWTVerificationError = (exception: Error | AggregateError | TypeError): void => {
  const authBase = process.env.AUTH_URI;
  if (exception instanceof TypeError && exception.cause instanceof AggregateError) {
    console.error(
      `Invalid token. Failed with TypeError>AggregateError. Logging out and redirecting to authentication at ${authBase}. ${exception.message} Exceptions to follow.`,
    );
    for (const anError of exception.cause.errors as unknown[]) {
      console.error(anError instanceof Error ? anError.message : String(anError));
    }
  } else if (exception instanceof AggregateError) {
    console.error(
      `Invalid token. Failed with AggregateError. Logging out and redirecting to authentication at ${authBase}. ${exception.message} Exceptions to follow.`,
    );
    for (const anError of exception.errors as unknown[]) {
      console.error(anError instanceof Error ? anError.message : String(anError));
    }
  } else if (exception instanceof TypeError) {
    console.error(
      `Invalid token. Failed with TypeError. Logging out and redirecting to authentication at ${authBase}. ${exception.message} Cause: ${String(exception.cause)}.`,
    );
  } else {
    console.error(`Invalid token. Logging out and redirecting to authentication at ${authBase}. ${exception.message}`);
  }
};

/** Both `email` and `code`-style fields present and non-empty. */
const hasNonEmpty = (a: string | undefined, b: string | undefined): boolean =>
  a !== undefined && a !== '' && b !== undefined && b !== '';

/**
 * Decide the redirect for a request that carries no JWT. Returns an outcome to
 * apply, or `null` when the user is already on an allowed (auth/manage) path.
 */
const resolveUnauthenticatedOutcome = (params: {
  requestedURI: string;
  authUri: string;
  authMode: number;
  pathname: string;
}): AuthOutcome | null => {
  const { requestedURI, authUri, authMode, pathname } = params;
  console.warn(`${requestedURI} does ${requestedURI.startsWith(authUri) ? '' : 'not '}start with ${authUri}.`);
  if (authMode === AuthMode.MagicalAuth && requestedURI.startsWith(authUri) && pathname !== '/user/manage') {
    console.warn(`Pathname: ${pathname}`);
    return null;
  }
  console.warn(
    `Detected unauthenticated user attempting to visit non-auth page, redirecting to authentication at ${process.env.AUTH_URI}...`,
  );
  return {
    activated: true,
    response: NextResponse.redirect(new URL(requireEnv('AUTH_URI')), {
      headers: cookieHeaders([
        generateCookieString('jwt', '', '0'),
        generateCookieString('href', requestedURI, (86400).toString()),
      ]),
    }),
  };
};

export const useAuth: MiddlewareHook = async (req) => {
  const toReturn = {
    activated: false,
    response: NextResponse.redirect(new URL(requireEnv('AUTH_URI')), { headers: {} }),
  };
  const requestedURI = getRequestedURI(req);
  const authMode = getAuthMode();

  console.warn(`Requested: ${requestedURI}`);
  const landingOnly = process.env.LANDING_ONLY;
  if (landingOnly !== undefined && landingOnly !== '') {
    if (req.nextUrl.pathname !== '/') {
      console.warn(`In LANDING_ONLY mode but requested '${req.nextUrl.pathname}', redirecting to '/'`);
      return {
        activated: true,
        response: NextResponse.redirect(new URL('/', req.url)),
      };
    }
  } else if (authMode) {
    const queryParams = getQueryParams(req);
    const authUri = requireEnv('AUTH_URI');
    if (requestedURI.endsWith('/user/logout')) {
      const response = NextResponse.redirect(new URL('/', req.url));

      // clear JWT cookie BEFORE redirect
      response.cookies.set('jwt', '', {
        path: '/',
        expires: new Date(0), // expire immediately
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      return {
        activated: true,
        response,
      };
    }
    if (hasNonEmpty(queryParams['verify_email'], queryParams['email'])) {
      console.warn('VERIFYING EMAIL: ', queryParams['email'], queryParams['verify_email']);
      await fetch(`${process.env.API_URI}/v1/user/verify/email`, {
        method: 'POST',
        body: JSON.stringify({
          email: queryParams['email'],
          code: queryParams['verify_email'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    console.warn('-Query Params-');
    console.warn(queryParams);
    if (hasNonEmpty(queryParams['code'], queryParams['email'])) {
      toReturn.response = await handleInviteRegistration(queryParams);
      toReturn.activated = true;
    }

    const privateRoutes = requireEnv('PRIVATE_ROUTES').split(',');
    if (!privateRoutes.some((path) => req.nextUrl.pathname.startsWith(path)) && !req.nextUrl.pathname.startsWith('/user')) {
      console.warn('Private routes: ', privateRoutes);
      console.warn('Public route: ', req.nextUrl.pathname);
      const token = getJWT(req);
      if (req.nextUrl.pathname.startsWith('/accept-invitation') && token.length > 0) {
        console.warn('Its only supposed to log when user clicked invite link and is logged in.');
      } else {
        return toReturn;
      }
    }
    if (req.nextUrl.pathname.startsWith('/user/close')) {
      // Let oauth close happen on subsequent links.
      return toReturn;
    }
    const jwt = getJWT(req);
    if (jwt !== '') {
      try {
        const response = await verifyJWT(jwt);
        console.warn('Response Status: ', response.status);
        const responseJSON: MiddlewareResponseJSON =
          response.status === 204 ? {} : ((await response.json()) as MiddlewareResponseJSON);
        console.warn(responseJSON);
        const outcome = resolveVerifiedJWTOutcome({
          status: response.status,
          responseJSON,
          requestedURI,
          authUri,
          authMode,
          jwt,
          pathname: req.nextUrl.pathname,
          reqUrl: req.url,
        });
        if (outcome !== null && 'throwSetCookie' in outcome) {
          console.warn('- UNKNOWN RESPONSE CODE GUARD CLAUSE INVOKED -');
          // @ts-expect-error NextJS' types are wrong.
          toReturn.response.headers.set('Set-Cookie', [
            generateCookieString('jwt', '', (0).toString()),
            generateCookieString('href', requestedURI, (86400).toString()),
          ]);
          throw new Error(
            `Invalid token response, status ${response.status}, detail ${JSON.stringify(responseJSON.detail)}.`,
          );
        } else if (outcome !== null) {
          toReturn.activated = outcome.activated;
          toReturn.response = outcome.response;
        } else {
          console.warn('JWT is valid and no guard clauses tripped.');
        }
        console.warn('JWT is valid (or server was unable to verify it).');
        if (queryParams['code'] !== undefined && queryParams['email'] !== undefined) {
          const redirect = new URL(`${process.env.APP_URI}/invite/${queryParams['code']}`);
          const teamParam = (queryParams['team'] ?? '').replaceAll('+', ' ');
          toReturn.response = NextResponse.redirect(redirect, {
            headers: cookieHeaders([generateCookieString('team', teamParam, (86400).toString())]),
          });
        }
      } catch (exception: unknown) {
        logJWTVerificationError(exception instanceof Error ? exception : new Error(String(exception)));
        toReturn.activated = true;
      }
    } else {
      const unauthOutcome = resolveUnauthenticatedOutcome({
        requestedURI,
        authUri,
        authMode,
        pathname: req.nextUrl.pathname,
      });
      if (unauthOutcome !== null) {
        toReturn.activated = unauthOutcome.activated;
        toReturn.response = unauthOutcome.response;
      }
    }
  }
  console.warn('Going to:');
  console.warn(toReturn);
  return toReturn;
};

export const useOAuth2: MiddlewareHook = async (req) => {
  const provider = req.nextUrl.pathname.split('?')[0]?.split('/').pop() ?? '';
  const redirect = new URL(`${process.env.AUTH_URI}/close/${provider}`);
  let toReturn = {
    activated: false,
    response: NextResponse.redirect(redirect),
  };
  const queryParams = getQueryParams(req);
  if (queryParams['code'] !== undefined && queryParams['code'] !== '') {
    const oAuthEndpoint = `${(process.env.API_URI ?? '').replace('localhost', (process.env.SERVERSIDE_API_URI ?? '').split(',')[0] ?? '')}/v1/oauth2/${provider}`;

    // Use the state parameter as the JWT if present
    const jwt = queryParams['state'] ?? getJWT(req);
    console.warn('Using JWT from state:', jwt);

    try {
      const response = await fetch(oAuthEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          code: queryParams['code'],
          referrer: redirect.toString(),
          state: jwt,
          invitation: req.cookies.get('invitation')?.value,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': jwt,
        },
      });

      console.warn('Middleware OAuth2 response status:', response.status);
      const auth = (await response.json()) as { detail?: string };
      console.warn('Middleware OAuth2 response:', auth);

      if (response.status !== 200) {
        throw new Error(`Invalid token response, status ${response.status}.`);
      }

      // Forward the original JWT in the response if present
      const headers = new Headers();
      if (jwt !== '') {
        headers.set('Authorization', jwt);
      }

      toReturn = {
        activated: true,
        response: NextResponse.redirect(auth.detail ?? '', {
          headers: headers,
        }),
      };
    } catch (error: unknown) {
      console.error('Middleware OAuth2 error:', error);
    }
  }
  return toReturn;
};
// eslint-disable-next-line @typescript-eslint/require-await
export const useJWTQueryParam: MiddlewareHook = async (req) => {
  const queryParams = getQueryParams(req);
  const jwtValue = queryParams['token'] ?? queryParams['jwt'] ?? '';
  const weekSeconds = (86400 * 7).toString();
  const toReturn = {
    activated: false,
    // This should set the cookie and then re-run the middleware (without query params).
    response: req.nextUrl.pathname.startsWith('/user/close')
      ? NextResponse.next({
          headers: cookieHeaders([generateCookieString('jwt', jwtValue, weekSeconds)]),
        })
      : NextResponse.redirect(req.cookies.get('href')?.value ?? requireEnv('APP_URI'), {
          headers: cookieHeaders([
            generateCookieString('jwt', jwtValue, weekSeconds),
            generateCookieString('href', '', (0).toString()),
          ]),
        }),
  };
  if (queryParams['token'] !== undefined || queryParams['jwt'] !== undefined) {
    toReturn.activated = true;
  }
  return toReturn;
};
