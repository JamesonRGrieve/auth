// SPDX-License-Identifier: AGPL-3.0-or-later
import { getCookie } from 'cookies-next/client';

/** The team the signed-in user is working in: chosen in the team switcher, or by accepting an invitation. */
export const ACTIVE_TEAM_COOKIE = 'auth-team';

/** A readable cookie's value, or '' when it is unset. */
export const cookieText = (name: string): string => {
  const value = getCookie(name);
  return typeof value === 'string' ? value : '';
};
