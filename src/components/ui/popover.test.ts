// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Surface tests for the Popover primitive. Popover uses a Radix portal
 * that we can't fully render without a DOM env; here we lock the public
 * three-symbol surface and the PopoverContent prop expectations.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

describe('Popover exports', () => {
  it('exposes Root + Trigger + Content', () => {
    expect(Popover).toBeDefined();
    expect(PopoverTrigger).toBeDefined();
    expectTypeOf(PopoverContent).toBeObject();
  });

  it('PopoverContent is named for devtools', () => {
    expect(PopoverContent.displayName).toBe('PopoverContent');
  });

  it('PopoverContent accepts align (start | center | end | undefined)', () => {
    type Props = React.ComponentPropsWithoutRef<typeof PopoverContent>;
    expectTypeOf<Props['align']>().toEqualTypeOf<'start' | 'center' | 'end' | undefined>();
  });

  it('PopoverContent accepts a numeric sideOffset', () => {
    type Props = React.ComponentPropsWithoutRef<typeof PopoverContent>;
    expectTypeOf<Props['sideOffset']>().toEqualTypeOf<number | undefined>();
  });

  it('PopoverContent accepts a className override', () => {
    type Props = React.ComponentPropsWithoutRef<typeof PopoverContent>;
    expectTypeOf<Props['className']>().toEqualTypeOf<string | undefined>();
  });
});
