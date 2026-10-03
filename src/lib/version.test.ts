// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { etagOf } from './version';

const CREATED = '2026-10-02T21:29:39.141754';
const UPDATED = '2026-10-03T09:14:02.000317';

describe('etagOf', () => {
  it('quotes updated_at verbatim, microseconds and all, else created_at', () => {
    expect(etagOf({ created_at: CREATED, updated_at: UPDATED })).toBe(`"${UPDATED}"`);
    expect(etagOf({ created_at: CREATED, updated_at: null })).toBe(`"${CREATED}"`);
    expect(etagOf({ created_at: '2026-01-01T00:00:00' })).toBe('"2026-01-01T00:00:00"');
  });

  it('refuses a row with no version, which no write could be guarded by', () => {
    expect(() => etagOf({})).toThrow(/no version/);
    expect(() => etagOf({ updated_at: '', created_at: null })).toThrow(/no version/);
  });
});
