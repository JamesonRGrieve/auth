// SPDX-License-Identifier: AGPL-3.0-or-later

/** Next.js search params repeat as arrays; pages that expect one value take the first. */
export const firstSearchParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;
