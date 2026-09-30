// SPDX-License-Identifier: AGPL-3.0-or-later
const HTTP_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * Whether `uri` is somewhere the API can be called: a path on the page's own origin (a same-origin
 * API base such as `''` or `/api`), or an absolute http(s) URL. A protocol-relative `//host` is
 * refused: it would leave the origin while looking like a path.
 */
export function validateURI(uri: string): boolean {
  if (uri.startsWith('/')) {
    return !uri.startsWith('//');
  }
  try {
    return HTTP_PROTOCOLS.has(new URL(uri).protocol);
  } catch {
    return false;
  }
}
