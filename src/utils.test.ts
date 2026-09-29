// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthMode, cookieDomainOptions, generateCookieString, getAuthMode } from './utils';

describe('cookieDomainOptions', () => {
  const originalDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

  afterEach(() => {
    if (originalDomain === undefined) {
      delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_COOKIE_DOMAIN = originalDomain;
    }
  });

  it('scopes to the configured domain', () => {
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = '.example.com';
    expect(cookieDomainOptions()).toEqual({ domain: '.example.com' });
  });

  it('omits the domain when unset or empty', () => {
    delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
    expect(cookieDomainOptions()).toEqual({});
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = '';
    expect(cookieDomainOptions()).toEqual({});
  });
});

describe('AuthMode enum', () => {
  it('exposes None / GTAuth / MagicalAuth with the expected numeric values', () => {
    expect(AuthMode.None).toBe(0);
    expect(AuthMode.GTAuth).toBe(1);
    expect(AuthMode.MagicalAuth).toBe(2);
  });
});

describe('getAuthMode', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_AUTH_URI;
    delete process.env.NEXT_PUBLIC_API_URI;
    delete process.env.APP_URI;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns None when AUTH_URI / API_URI are unset', () => {
    expect(getAuthMode()).toBe(AuthMode.None);
  });

  it('returns GTAuth when AUTH_URI does not start with APP_URI', () => {
    process.env.NEXT_PUBLIC_AUTH_URI = 'https://auth.example.com/user';
    process.env.NEXT_PUBLIC_API_URI = 'https://api.example.com';
    process.env.APP_URI = 'https://app.different.com';
    expect(getAuthMode()).toBe(AuthMode.GTAuth);
  });

  it('returns MagicalAuth when AUTH_URI starts with APP_URI and ends with /user', () => {
    process.env.NEXT_PUBLIC_AUTH_URI = 'https://app.example.com/user';
    process.env.NEXT_PUBLIC_API_URI = 'https://api.example.com';
    process.env.APP_URI = 'https://app.example.com';
    expect(getAuthMode()).toBe(AuthMode.MagicalAuth);
  });

  it('throws when MagicalAuth AUTH_URI does not end with /user', () => {
    process.env.NEXT_PUBLIC_AUTH_URI = 'https://app.example.com/login';
    process.env.NEXT_PUBLIC_API_URI = 'https://api.example.com';
    process.env.APP_URI = 'https://app.example.com';
    expect(() => getAuthMode()).toThrow(/Invalid AUTH_URI/);
  });
});

describe('generateCookieString', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = 'example.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('formats a cookie header string with domain / path / max-age / samesite', () => {
    expect(generateCookieString('jwt', 'abc123', '600')).toBe(
      'jwt=abc123; Domain=example.com; Path=/; Max-Age=600; SameSite=strict;',
    );
  });

  it('handles empty values without dropping required attributes', () => {
    const out = generateCookieString('session', '', '0');
    expect(out).toContain('session=;');
    expect(out).toContain('Max-Age=0;');
    expect(out).toContain('SameSite=strict;');
  });
});
