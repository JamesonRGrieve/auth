// SPDX-License-Identifier: AGPL-3.0-or-later
type PlainObject = Record<string, unknown>;

export function deepMergeJSON(...objects: PlainObject[]): PlainObject {
  const deepCopyObjects = objects.map((object) => JSON.parse(JSON.stringify(object)) as PlainObject);
  const result: PlainObject = {};
  for (const current of deepCopyObjects) {
    Object.assign(result, current);
  }
  return result;
}

const isPlainObject = (value: PlainObject[string]): value is PlainObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Merge `obj2` over `obj1`, recursing into nested plain objects. Only own enumerable
 * keys are read (a `for...in` would also walk inherited ones), and the result is built
 * with Object.fromEntries, so a `__proto__` key becomes plain data, not a prototype.
 */
export default function deepMerge(obj1: PlainObject, obj2: PlainObject): PlainObject {
  const merged = new Map(Object.entries(obj1));
  for (const [key, next] of Object.entries(obj2)) {
    const prev = merged.get(key);
    merged.set(key, isPlainObject(next) && prev !== undefined && isPlainObject(prev) ? deepMerge(prev, next) : next);
  }
  return Object.fromEntries(merged);
}
