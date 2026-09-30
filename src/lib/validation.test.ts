// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { validateURI } from './validation';

describe('validateURI', () => {
  it('accepts absolute http(s) URLs', () => {
    expect(validateURI('http://example.com')).toBe(true);
    expect(validateURI('https://example.com/path?q=1#frag')).toBe(true);
  });

  it('accepts a path on the page’s own origin, as a same-origin API base produces', () => {
    expect(validateURI('/v1/user/exists')).toBe(true);
    expect(validateURI('/api/v1/user/authorize')).toBe(true);
  });

  it('refuses a protocol-relative URL, which would leave the origin', () => {
    expect(validateURI('//evil.example/v1/user')).toBe(false);
  });

  it('refuses schemes the API is not served over', () => {
    expect(validateURI('mailto:user@example.com')).toBe(false);
    expect(validateURI('ftp://example.com/file')).toBe(false);
    expect(validateURI('data:text/html,hello')).toBe(false);
  });

  it('rejects plainly invalid input', () => {
    expect(validateURI('not a url')).toBe(false);
    expect(validateURI('')).toBe(false);
    expect(validateURI('http://')).toBe(false);
  });
});
