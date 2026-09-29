// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Surface test for DataTableColumnHeader. The component wires a TanStack
 * Column to a shadcn dropdown menu with asc / desc / hide actions. The
 * full render needs a real Column instance; here we pin the public
 * signature.
 *
 * Uses `import type` to avoid loading the runtime module — the source
 * imports `@jgrieve/forms/*` for its button + dropdown menu.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { DataTableColumnHeader } from './data-table-column-header';
import type { DataTableColumn } from './features';

describe('DataTableColumnHeader (surface)', () => {
  it('is the named export and a callable component', () => {
    expectTypeOf<typeof DataTableColumnHeader>().toBeFunction();
  });

  it('accepts a Column, a title, and forwards HTMLDivElement attributes', () => {
    // We can't directly extract the props of a generic function via
    // expectTypeOf, but we can confirm it instantiates over arbitrary
    // row / value generics.
    type RowShape = { id: string; name: string };
    expectTypeOf<typeof DataTableColumnHeader<RowShape, unknown>>().toBeFunction();
    expectTypeOf<DataTableColumn<RowShape>>().not.toBeAny();
  });
});
