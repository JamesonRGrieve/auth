// SPDX-License-Identifier: AGPL-3.0-or-later

/** A same-origin path only, so a crafted redirect target can't send the user off-site. */
export const safeRedirectPath = (target: string, fallback = '/'): string =>
  target.startsWith('/') && !target.startsWith('//') ? target : fallback;
