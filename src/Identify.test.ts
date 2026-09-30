// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Surface test for the Identify component: pins the prop type surface so downstream apps cannot
 * have it widened or narrowed silently. OAuth sign-in comes from `oauthProviders` in the config.
 *
 * Uses `import type` to avoid loading the runtime module.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type Identify from './Identify';
import type { IdentifyProps } from './Identify';

describe('Identify (surface)', () => {
  it('default export is a React component function', () => {
    expectTypeOf<typeof Identify>().toBeFunction();
  });

  it('IdentifyProps exposes the three optional config fields', () => {
    expectTypeOf<IdentifyProps>().toEqualTypeOf<{
      identifyEndpoint?: string;
      redirectToOnExists?: string;
      redirectToOnNotExists?: string;
    }>();
  });

  it('every IdentifyProps field is optional', () => {
    expectTypeOf<IdentifyProps>().toExtend<Partial<IdentifyProps>>();
  });
});
