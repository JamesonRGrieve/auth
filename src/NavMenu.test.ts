// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expectTypeOf, it } from 'vitest';
import type { IconComponent, Item } from './NavMenu';

describe('NavMenu types', () => {
  it('describes an entry with an optional url, icon and two-level children', () => {
    expectTypeOf<Item>().toExtend<{ title: string; url?: string; items?: { title: string; url: string }[] }>();
    expectTypeOf<{ title: 'Team'; url: '/team' }>().toExtend<Item>();
  });

  it('takes any icon component that accepts a className and size', () => {
    expectTypeOf<NonNullable<Item['icon']>>().toEqualTypeOf<IconComponent>();
  });
});
