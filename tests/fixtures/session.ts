// SPDX-License-Identifier: AGPL-3.0-or-later
import { CSRF_COOKIE } from '../../src/lib/session';

/**
 * Give the test browser a session, as a sign-in leaves one: the readable CSRF cookie beside the
 * HttpOnly session cookie. Hooks that need a session only ask the API while it is set.
 * Returns the cleanup that signs out again.
 */
export function withSession(): () => void {
  document.cookie = `${CSRF_COOKIE}=csrf-test; path=/`;
  return () => {
    document.cookie = `${CSRF_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  };
}
