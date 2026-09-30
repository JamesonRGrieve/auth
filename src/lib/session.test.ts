// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteCookie, setCookie } from 'cookies-next/client';
import { afterEach, describe, expect, it } from 'vitest';
import { csrfHeaders, hasSession } from './session';

describe('csrfHeaders', () => {
  afterEach(() => {
    deleteCookie('zx_csrf');
  });

  it('echoes zx_csrf on every method that can change state', () => {
    setCookie('zx_csrf', 'csrf-1');
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) {
      expect(csrfHeaders(method)).toEqual({ 'X-CSRF-Token': 'csrf-1' });
    }
  });

  it('sends nothing on safe methods', () => {
    setCookie('zx_csrf', 'csrf-1');
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(csrfHeaders(method)).toEqual({});
    }
  });

  it('sends nothing without a session', () => {
    expect(csrfHeaders('POST')).toEqual({});
  });
});

describe('hasSession', () => {
  afterEach(() => {
    deleteCookie('zx_csrf');
  });

  it('is true while the readable CSRF cookie that accompanies a session is set', () => {
    expect(hasSession()).toBe(false);
    setCookie('zx_csrf', 'csrf-1');
    expect(hasSession()).toBe(true);
    setCookie('zx_csrf', '');
    expect(hasSession()).toBe(false);
  });
});
