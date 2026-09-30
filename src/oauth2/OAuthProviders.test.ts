// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import providers, { oauth2ProviderDisplay } from './OAuthProviders';

describe('OAuthProviders', () => {
  it('covers every provider the server can sign in or link with', () => {
    expect(Object.keys(providers).sort()).toEqual(['amazon', 'forgejo', 'github', 'google', 'microsoft']);
    for (const display of Object.values(providers)) {
      expect(display.label).not.toBe('');
      expect(display.icon).toBeDefined();
    }
  });

  it('looks a provider up by the server’s name in any case', () => {
    expect(oauth2ProviderDisplay('google')).toBe(providers.google);
    expect(oauth2ProviderDisplay('GitHub')).toBe(providers.github);
  });

  it('shows an unknown provider by its name', () => {
    expect(oauth2ProviderDisplay('keycloak').label).toBe('Keycloak');
    expect(oauth2ProviderDisplay('toString').label).toBe('ToString');
  });
});
