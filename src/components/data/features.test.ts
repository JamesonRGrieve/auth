// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Behavioural test for the shared DataTable feature set: builds a real table instance
 * with it and exercises the capabilities DataTable relies on. A feature or row model
 * missing from the registration makes its API disappear rather than throw, so each one is
 * checked through the API it provides.
 */
import { type TableState, useTable } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type DataTableColumnDef, type DataTableFeatures, type DataTableInstance, dataTableFeatures } from './features';

type Person = { name: string; age: number; role: string };

const people: Person[] = [
  { name: 'Carol', age: 41, role: 'admin' },
  { name: 'alice', age: 29, role: 'user' },
  { name: 'Bob', age: 35, role: 'user' },
];

const columns: DataTableColumnDef<Person>[] = [
  { accessorKey: 'name', meta: { headerName: 'Name' } },
  { accessorKey: 'age' },
  { accessorKey: 'role' },
];

const build = (initialState: Partial<TableState<DataTableFeatures>> = {}): DataTableInstance<Person> =>
  renderHook(() => useTable({ features: dataTableFeatures, data: people, columns, initialState, meta: { title: 'People' } }))
    .result.current;

const names = (table: DataTableInstance<Person>): string[] => table.getRowModel().rows.map((row) => row.original.name);

describe('dataTableFeatures', () => {
  it('sorts with the auto-selected sort function (case-insensitive text)', () => {
    expect(names(build({ sorting: [{ id: 'name', desc: false }] }))).toEqual(['alice', 'Bob', 'Carol']);
  });

  it('sorts numbers numerically', () => {
    expect(names(build({ sorting: [{ id: 'age', desc: true }] }))).toEqual(['Carol', 'Bob', 'alice']);
  });

  it('filters with the auto-selected filter function (substring, case-insensitive)', () => {
    expect(names(build({ columnFilters: [{ id: 'name', value: 'AL' }] }))).toEqual(['alice']);
  });

  it('paginates', () => {
    const table = build({ pagination: { pageIndex: 0, pageSize: 2 } });
    expect(table.getRowModel().rows).toHaveLength(2);
    expect(table.getPageCount()).toBe(2);
  });

  it('exposes faceted unique values for the filter popovers', () => {
    const facets = build().getColumn('role')?.getFacetedUniqueValues();
    expect(facets?.get('user')).toBe(2);
    expect(facets?.get('admin')).toBe(1);
  });

  it('supports row selection and column visibility', () => {
    const table = build({ rowSelection: { '0': true }, columnVisibility: { age: false } });
    expect(table.getSelectedRowModel().rows).toHaveLength(1);
    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual(['name', 'role']);
  });

  it('carries typed table and column meta', () => {
    const table = build();
    expect(table.options.meta?.title).toBe('People');
    expect(table.getColumn('name')?.columnDef.meta?.headerName).toBe('Name');
  });
});
