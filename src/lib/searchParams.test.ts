// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { firstSearchParam } from './searchParams';

describe('firstSearchParam', () => {
  it('returns a single value unchanged', () => {
    expect(firstSearchParam('abc')).toBe('abc');
  });

  it('returns the first entry of a repeated param', () => {
    expect(firstSearchParam(['first', 'second'])).toBe('first');
  });

  it('returns undefined for an absent or empty repeated param', () => {
    expect(firstSearchParam(undefined)).toBeUndefined();
    expect(firstSearchParam([])).toBeUndefined();
  });
});
