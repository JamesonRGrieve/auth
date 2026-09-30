// SPDX-License-Identifier: AGPL-3.0-or-later
import md5 from 'md5';

/** The avatar edge in pixels when the caller doesn't ask for one. */
export const DEFAULT_AVATAR_SIZE = 40;

/**
 * The Gravatar URL for `email` at `size` pixels, or '' without an address. `d=404` makes a missing
 * avatar fail to load, so the caller's fallback shows instead of Gravatar's placeholder.
 */
export const getGravatarUrl = (email: string, size = DEFAULT_AVATAR_SIZE): string => {
  if (email === '') {
    return '';
  }
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
};
