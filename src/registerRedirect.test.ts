// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { loginRedirectPath, RegisterResponseSchema } from './registerRedirect';

const LOGIN = '/user/login';

describe('loginRedirectPath', () => {
  it('returns the bare login path when the server requests no follow-up', () => {
    expect(loginRedirectPath(LOGIN, undefined)).toBe(LOGIN);
    expect(loginRedirectPath(LOGIN, null)).toBe(LOGIN);
    expect(loginRedirectPath(LOGIN, { verify_email: false })).toBe(LOGIN);
  });

  it('carries the verification flags', () => {
    expect(loginRedirectPath(LOGIN, { verify_email: true, verify_sms: true })).toBe(
      `${LOGIN}?verify_email=true&verify_sms=true`,
    );
  });

  it('goes to wherever the login page is mounted', () => {
    expect(loginRedirectPath('/account/login', { verify_sms: true })).toBe('/account/login?verify_sms=true');
  });
});

describe('RegisterResponseSchema', () => {
  it('keeps the follow-up flags and ignores the rest of the answer', () => {
    expect(RegisterResponseSchema.parse({ id: 'u1', verify_email: true })).toEqual({ verify_email: true });
    expect(RegisterResponseSchema.parse(undefined)).toBeUndefined();
  });

  it('rejects flags of the wrong type', () => {
    expect(RegisterResponseSchema.safeParse({ verify_email: 'yes' }).success).toBe(false);
  });
});
