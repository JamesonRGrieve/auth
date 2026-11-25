// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cookieDomainOptions,
  decodePublicEnv,
  encodePublicEnv,
  looksSecret,
  PUBLIC_ENV_COOKIE,
  publicEnv,
} from './publicEnv';

const PROD = 'https://rpg.example.com';
const DEV = 'https://dev.rpg.example.com';

function setCookie(values: Record<string, string>): void {
  document.cookie = `${PUBLIC_ENV_COOKIE}=${encodePublicEnv(values)}; path=/`;
}

describe('publicEnv', () => {
  afterEach(() => {
    // Restored first: one test takes the server's view, with no document.
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    document.cookie = `${PUBLIC_ENV_COOKIE}=; path=/; max-age=0`;
  });

  it('reads the instance it runs on in the browser, from the cookie the middleware set', () => {
    setCookie({ APP_URI: DEV, COOKIE_DOMAIN: 'rpg.example.com' });
    expect(publicEnv('APP_URI')).toBe(DEV);
    expect(cookieDomainOptions()).toEqual({ domain: 'rpg.example.com' });
  });

  it('has nothing for a name neither the cookie nor the build gives', () => {
    setCookie({});
    expect(publicEnv('NOT_SET')).toBeUndefined();
    expect(cookieDomainOptions()).toEqual({});
  });

  it('reads runtime env on the server, so one build answers for each instance', () => {
    vi.stubGlobal('document', undefined);
    vi.stubEnv('APP_URI', PROD);
    expect(publicEnv('APP_URI')).toBe(PROD);
    vi.stubEnv('APP_URI', DEV);
    expect(publicEnv('APP_URI')).toBe(DEV);
  });

  it('round-trips the cookie, and reads a broken one as empty', () => {
    expect(decodePublicEnv(encodePublicEnv({ APP_URI: DEV }))).toEqual({ APP_URI: DEV });
    expect(decodePublicEnv('%7Bnot json')).toEqual({});
    expect(decodePublicEnv(encodeURIComponent('{"APP_URI":3}'))).toEqual({});
  });

  it('knows a secret by its name', () => {
    expect(looksSecret('API_KEY')).toBe(true);
    expect(looksSecret('SESSION_SECRET')).toBe(true);
    expect(looksSecret('OAUTH_TOKEN')).toBe(true);
    expect(looksSecret('APP_URI')).toBe(false);
    expect(looksSecret('KEYCLOAK_URI')).toBe(false);
  });
});
