// SPDX-License-Identifier: AGPL-3.0-or-later
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthMode,
  cookieDomainOptions,
  generateCookieString,
  getAuthMode,
  getJWT,
  getRequestedURI,
  verifyJWT,
} from './utils';

describe('getRequestedURI', () => {
  const originalAppUri = process.env.APP_URI;

  beforeEach(() => {
    process.env.APP_URI = 'https://app.example.com/';
  });

  afterEach(() => {
    process.env.APP_URI = originalAppUri;
  });

  it('keeps the origin and query of a public (multi-label) host', () => {
    expect(getRequestedURI(new NextRequest('https://app.example.com:8443/user/login?x=1'))).toBe(
      'https://app.example.com:8443?x=1',
    );
  });

  it('maps an internal single-label host onto APP_URI plus the path', () => {
    expect(getRequestedURI(new NextRequest('http://0f86ff25b193:1109/user/login?x=1'))).toBe(
      'https://app.example.com/user/login?x=1',
    );
  });

  it('does not repeat a path APP_URI already ends with', () => {
    process.env.APP_URI = 'https://app.example.com/user';
    expect(getRequestedURI(new NextRequest('http://localhost:1109/user'))).toBe('https://app.example.com/user');
  });
});

describe('getJWT', () => {
  it('strips any Bearer prefix from the jwt cookie and never logs the token', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const req = new NextRequest('https://app.example.com/');
    req.cookies.set('jwt', 'Bearer tok.en.value');
    expect(getJWT(req)).toBe('tok.en.value');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns an empty string without a jwt cookie', () => {
    expect(getJWT(new NextRequest('https://app.example.com/'))).toBe('');
  });
});

describe('verifyJWT', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports an unreachable auth server as 502, never as a successful verification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await verifyJWT('secret.jwt.token');
    expect(response.status).toBe(502);
    expect(error.mock.calls.flat().join(' ')).not.toContain('secret.jwt.token');
  });

  it('sends the token as a Bearer credential and returns the server response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await verifyJWT('tok');
    expect(response.status).toBe(204);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: 'Bearer tok' } });
  });
});

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
