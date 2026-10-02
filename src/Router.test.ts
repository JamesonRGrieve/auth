// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Surface test for the AuthRouter component. Router dispatches across
 * Identify / Login / Register / Logout / Close / MagicLink / ErrorPage and
 * the app's own pages based on the slug array. The full dispatch matrix needs a
 * Next render harness; here we pin the public AuthenticationConfig
 * shape that downstream apps construct.
 *
 * Uses `import type` to avoid loading the runtime module — AuthRouter
 * transitively imports `@jgrieve/forms/*` via its sub-pages,
 * which does not resolve when the auth repo is opened standalone.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type AuthRouter from './Router';
import type { AuthenticationConfig, SignInAlternative } from './Router';

describe('AuthRouter (surface)', () => {
  it('default export is a React component function', () => {
    expectTypeOf<typeof AuthRouter>().toBeFunction();
  });

  it('AuthenticationConfig exposes the canonical page slots', () => {
    expectTypeOf<AuthenticationConfig['identify']>().not.toBeAny();
    expectTypeOf<AuthenticationConfig['login']>().not.toBeAny();
    expectTypeOf<AuthenticationConfig['manage']>().not.toBeAny();
    expectTypeOf<AuthenticationConfig['register']>().not.toBeAny();
    expectTypeOf<AuthenticationConfig['close']>().not.toBeAny();
    expectTypeOf<AuthenticationConfig['logout']>().not.toBeAny();
    expectTypeOf<AuthenticationConfig['error']>().not.toBeAny();
  });

  it('AuthenticationConfig.authModes carries the basic/magical email modes', () => {
    expectTypeOf<AuthenticationConfig['authModes']>().toEqualTypeOf<{
      basic: boolean;
      magical: boolean;
    }>();
  });

  it('AuthenticationConfig.signInAlternatives lists the other sign-in pages, as labelled paths', () => {
    expectTypeOf<AuthenticationConfig['signInAlternatives']>().toEqualTypeOf<readonly SignInAlternative[]>();
    expectTypeOf<SignInAlternative>().toEqualTypeOf<{ label: string; path: string }>();
  });

  it('AuthenticationConfig.oauthProviders names the sign-in providers', () => {
    expectTypeOf<AuthenticationConfig['oauthProviders']>().toEqualTypeOf<readonly string[]>();
  });

  it('appName / authPath / authServer are strings', () => {
    expectTypeOf<AuthenticationConfig['appName']>().toEqualTypeOf<string>();
    expectTypeOf<AuthenticationConfig['authPath']>().toEqualTypeOf<string>();
    expectTypeOf<AuthenticationConfig['authServer']>().toEqualTypeOf<string>();
  });

  it('recaptchaSiteKey is optional (env-sourced, may be undefined)', () => {
    type Cfg = AuthenticationConfig;
    expectTypeOf<Cfg['recaptchaSiteKey']>().toEqualTypeOf<string | undefined>();
  });
});
