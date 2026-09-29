// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { useTable } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { DataTablePagination } from './data-table-pagination';
import { type DataTableColumnDef, dataTableFeatures } from './features';

interface Row {
  id: string;
  email: string;
}

const columns: DataTableColumnDef<Row>[] = [{ accessorKey: 'email', header: 'Email' }];

const makeRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, i) => ({ id: String(i), email: `user${i}@example.com` }));

// Story wrapper: build a table instance and pass it to the pagination component.
// The wrapper lives inside the story file because the pagination component
// cannot exist without a Table.
const PaginationHarness = ({ rowCount, pageSize }: { rowCount: number; pageSize: number }): ReactNode => {
  const table = useTable({
    features: dataTableFeatures,
    data: makeRows(rowCount),
    columns,
    initialState: { pagination: { pageSize, pageIndex: 0 } },
  });
  return <DataTablePagination table={table} />;
};

const meta: Meta<typeof PaginationHarness> = {
  title: 'Auth/Data/DataTablePagination',
  component: PaginationHarness,
  parameters: {
    docs: {
      description: {
        component:
          'DataTablePagination renders the rows-per-page selector, page indicator, and first/prev/next/last buttons. Disable states are derived from `table.getCanPreviousPage()` / `getCanNextPage()`.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof PaginationHarness>;

export const Default: Story = {
  args: { rowCount: 100, pageSize: 10 },
};

export const FirstPageOfFew: Story = {
  args: { rowCount: 25, pageSize: 10 },
};

export const SinglePage: Story = {
  args: { rowCount: 5, pageSize: 10 },
};

export const LargePageSize: Story = {
  args: { rowCount: 200, pageSize: 50 },
};
