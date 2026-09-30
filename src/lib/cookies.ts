// SPDX-License-Identifier: AGPL-3.0-or-later
import { getCookie } from 'cookies-next/client';

/** A readable cookie's value, or '' when it is unset. */
export const cookieText = (name: string): string => {
  const value = getCookie(name);
  return typeof value === 'string' ? value : '';
};
