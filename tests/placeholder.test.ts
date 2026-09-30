// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Placeholder test to satisfy tsconfig.test.json's include glob until
 * real Vitest coverage lands per workspace §7.6. Tracked in todo.json.
 */
import { describe, expect, it } from 'vitest';

describe('placeholder', () => {
  it('asserts truthy', () => {
    expect(true).toBe(true);
  });
});
