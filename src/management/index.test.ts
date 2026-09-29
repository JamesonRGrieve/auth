// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Surface test for the Manage account page. The page talks to the fixed
 * /v1/user contract; the only knob is where "Go to <app>" leads.
 *
 * Uses `import type` to avoid loading the runtime module — Manage
 * imports `@jgrieve/forms/*`.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type Manage from './index';
import type { ManageProps } from './index';

describe('Manage (surface)', () => {
  it('default export is a React component function', () => {
    expectTypeOf<typeof Manage>().toBeFunction();
  });

  it('ManageProps only exposes the optional return path', () => {
    expectTypeOf<ManageProps>().toEqualTypeOf<{ returnPath?: string }>();
  });
});
