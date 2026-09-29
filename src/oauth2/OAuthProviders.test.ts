// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * OAuthProviders exports a static map of provider configs keyed by display
 * name. Every entry must declare a `scope`, an authorization `uri`, an empty
 * default `params`, and an `icon` ReactNode. The `client_id` is sourced from
 * an env var and is therefore allowed to be `undefined` when unconfigured.
 */
import { describe, expect, it } from 'vitest';
import providers, { getOAuth2Provider } from './OAuthProviders';

describe('OAuthProviders', () => {
  it('exports a non-empty map of providers', () => {
    expect(typeof providers).toBe('object');
    expect(Object.keys(providers).length).toBeGreaterThan(20);
  });

  it('every provider entry has scope, uri, params, and icon', () => {
    for (const [name, config] of Object.entries(providers)) {
      expect(typeof config.scope).toBe('string');
      expect(config.scope.length).toBeGreaterThan(0);
      expect(typeof config.uri).toBe('string');
      expect(config.uri.startsWith('http')).toBe(true);
      expect(typeof config.params).toBe('object');
      expect(config.icon).toBeDefined();
      // The provider name must round-trip through the URL slug transform
      // OAuth.tsx applies. We test it here so a future "fancy unicode name"
      // entry does not silently break the close handler.
      const slug = name.replaceAll('.', '-').replaceAll(' ', '-').replaceAll('_', '-').toLowerCase();
      expect(slug).toMatch(/^[\da-z-]+$/);
    }
  });

  it('Google entry requests offline access via params.access_type', () => {
    const google = getOAuth2Provider('Google');
    expect(google?.params).toMatchObject({ access_type: 'offline' });
  });

  it('uses unique authorization URIs across providers', () => {
    const uris = Object.values(providers).map((config) => config.uri);
    expect(new Set(uris).size).toBe(uris.length);
  });

  it('Tesla scope opts into the location + commands surfaces (smoke)', () => {
    const tesla = getOAuth2Provider('Tesla');
    expect(tesla?.scope).toMatch(/vehicle_location/);
    expect(tesla?.scope).toMatch(/vehicle_cmds/);
  });

  it('getOAuth2Provider returns the entry for a known name and undefined otherwise', () => {
    expect(getOAuth2Provider('Google')).toBe(providers.Google);
    expect(getOAuth2Provider('NotAProvider')).toBeUndefined();
    expect(getOAuth2Provider('toString')).toBeUndefined();
  });

  it('client_id is either a non-empty string or undefined (env-sourced)', () => {
    for (const [, config] of Object.entries(providers)) {
      const id = (config as { client_id?: string }).client_id;
      expect(id === undefined || (typeof id === 'string' && id.length > 0)).toBe(true);
    }
  });
});
