// SPDX-License-Identifier: AGPL-3.0-or-later
import { deleteCookie, setCookie } from 'cookies-next/client';
import { afterEach, describe, expect, it } from 'vitest';
import { cookieText } from './cookies';

describe('cookieText', () => {
  afterEach(() => {
    deleteCookie('team');
  });

  it('is the cookie’s value, or empty when it is unset', () => {
    expect(cookieText('team')).toBe('');
    setCookie('team', 'Alpha');
    expect(cookieText('team')).toBe('Alpha');
  });
});
