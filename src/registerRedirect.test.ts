// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { loginRedirectPath } from './registerRedirect';

describe('loginRedirectPath', () => {
  it('returns the bare login path when the server requests no follow-up', () => {
    expect(loginRedirectPath(undefined)).toBe('/user/login');
    expect(loginRedirectPath({ otp_uri: '', verify_email: false })).toBe('/user/login');
  });

  it('carries the verification flags', () => {
    expect(loginRedirectPath({ verify_email: true, verify_sms: true })).toBe(
      '/user/login?verify_email=true&verify_sms=true',
    );
  });

  it('encodes an otpauth URI so its own query survives as one parameter', () => {
    const otpUri = 'otpauth://totp/App:a@b.com?secret=ABC&issuer=App';
    const path = loginRedirectPath({ otp_uri: otpUri });
    expect(new URLSearchParams(path.split('?')[1]).get('otp_uri')).toBe(otpUri);
  });
});
