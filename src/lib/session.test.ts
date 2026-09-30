// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteCookie, setCookie } from 'cookies-next/client';
import { afterEach, describe, expect, it } from 'vitest';
import { csrfHeaders } from './session';

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
