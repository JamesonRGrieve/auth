// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { loginRedirectPath } from './registerRedirect';

describe('loginRedirectPath', () => {
  it('returns the bare login path when the server requests no follow-up', () => {
    expect(loginRedirectPath(undefined)).toBe('/user/login');
    expect(loginRedirectPath({ verify_email: false })).toBe('/user/login');
  });

  it('carries the verification flags', () => {
    expect(loginRedirectPath({ verify_email: true, verify_sms: true })).toBe(
      '/user/login?verify_email=true&verify_sms=true',
    );
  });
});
