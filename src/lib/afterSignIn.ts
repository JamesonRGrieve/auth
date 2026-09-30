// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteCookie } from 'cookies-next/client';
import type { AuthenticationConfig } from '../Router';
import { cookieDomainOptions } from '../utils';
import { cookieText } from './cookies';
import { safeRedirectPath } from './redirect';

/** Set by the auth middleware from an invite link; answered on the account page. */
const INVITATION_COOKIE = 'invitation';
/** Set by the auth middleware: the page a sign-in interrupted. */
const RETURN_COOKIE = 'href';

/**
 * Where a user goes once signed in, whichever way they signed in. A pending invitation goes to
 * the account page, which lists it to answer; otherwise the page the sign-in interrupted, else the
 * auth pages. The server has already set the HttpOnly session cookie, so there is nothing to store.
 */
export function signedInDestination({ authPath, manage }: Pick<AuthenticationConfig, 'authPath' | 'manage'>): string {
  if (cookieText(INVITATION_COOKIE) !== '') {
    deleteCookie(INVITATION_COOKIE, cookieDomainOptions());
    return `${authPath}${manage.path}`;
  }
  return safeRedirectPath(cookieText(RETURN_COOKIE), authPath);
}
