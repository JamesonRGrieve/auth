// SPDX-License-Identifier: AGPL-3.0-or-later
// A row's version, which every change to it is guarded by: the server refuses a PUT, PATCH or
// DELETE whose If-Match is not the row's current version (412), so nothing read earlier
// overwrites what changed since.

/** What a row carries to version it: when it last changed, else when it was made. */
export interface Versioned {
  readonly updated_at?: string | null | undefined;
  readonly created_at?: string | null | undefined;
}

/**
 * The If-Match value for `row`: its `updated_at` (`created_at` if never updated), quoted, exactly as
 * the server serialised it. It is opaque, so it is never parsed or reformatted.
 */
export function etagOf(row: Versioned): string {
  const version = row.updated_at ?? row.created_at;
  if (version === undefined || version === null || version === '') {
    throw new Error('A row without updated_at or created_at cannot be written: it has no version to guard.');
  }
  return `"${version}"`;
}
