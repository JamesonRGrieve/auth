// SPDX-License-Identifier: AGPL-3.0-or-later

/** A stand-in origin: only a target that stays on it is a path on this site. */
const SAME_SITE = 'https://same-site.invalid';

/**
 * A same-origin path only, so a crafted redirect target can't send the user off-site. The target is
 * resolved the way a browser would (backslashes, tabs and newlines included, which turn `/\evil.com`
 * into another host), and only a result on this origin is kept, as its normalised path.
 */
export const safeRedirectPath = (target: string, fallback = '/'): string => {
  if (!target.startsWith('/')) {
    return fallback;
  }
  try {
    const resolved = new URL(target, SAME_SITE);
    return resolved.origin === SAME_SITE ? `${resolved.pathname}${resolved.search}${resolved.hash}` : fallback;
  } catch {
    return fallback;
  }
};
