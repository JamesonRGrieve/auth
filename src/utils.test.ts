// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it } from 'vitest';
import { encodePublicEnv, PUBLIC_ENV_COOKIE } from './publicEnv';
import { cookieDomainOptions } from './utils';

const instance = (values: Record<string, string>): void => {
  document.cookie = `${PUBLIC_ENV_COOKIE}=${encodePublicEnv(values)}; path=/`;
};

describe('cookieDomainOptions', () => {
  afterEach(() => {
    document.cookie = `${PUBLIC_ENV_COOKIE}=; path=/; max-age=0`;
  });

  it('scopes to the instance’s cookie domain', () => {
    instance({ COOKIE_DOMAIN: '.example.com' });
    expect(cookieDomainOptions()).toEqual({ domain: '.example.com' });
  });

  it('omits the domain when the instance has none', () => {
    instance({});
    expect(cookieDomainOptions()).toEqual({});
    instance({ COOKIE_DOMAIN: '' });
    expect(cookieDomainOptions()).toEqual({});
  });
});
