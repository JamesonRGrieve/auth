// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import deepMerge, { deepMergeJSON } from './objects';

describe('deepMerge', () => {
  it('merges flat keys with the right-hand object winning conflicts', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('recurses into nested object values', () => {
    const out = deepMerge({ server: { host: 'localhost', port: 80 } }, { server: { port: 443, tls: true } });
    expect(out).toEqual({ server: { host: 'localhost', port: 443, tls: true } });
  });

  it('does not recurse into arrays (right-hand replaces)', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] });
  });

  it('ignores inherited keys and treats __proto__ as plain data', () => {
    const inherited = Object.create({ leaked: true }) as Record<string, unknown>;
    expect(deepMerge({ a: 1 }, inherited)).toEqual({ a: 1 });
    const hostile = JSON.parse('{"__proto__": {"polluted": true}}') as Record<string, unknown>;
    const merged = deepMerge({}, hostile);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
  });

  it('preserves left-hand keys when right-hand omits them', () => {
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
  });
});

describe('deepMergeJSON', () => {
  it('flattens multiple objects via deep-copied shallow assignment', () => {
    expect(deepMergeJSON({ a: 1 }, { b: 2 }, { a: 9, c: 3 })).toEqual({ a: 9, b: 2, c: 3 });
  });

  it('deep-copies input so callers cannot mutate originals through the result', () => {
    const src = { nested: { value: 1 } };
    const merged = deepMergeJSON(src);
    // A deep copy clones nested objects, so the nested references must differ
    // (mutating through `merged` therefore cannot reach `src`).
    expect(merged).not.toBe(src);
    expect(merged['nested']).not.toBe(src.nested);
    expect(merged).toEqual(src);
  });

  it('returns an empty object when called with no arguments', () => {
    expect(deepMergeJSON()).toEqual({});
  });
});
