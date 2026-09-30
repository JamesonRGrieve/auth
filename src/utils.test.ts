// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it } from 'vitest';
import { cookieDomainOptions } from './utils';

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
