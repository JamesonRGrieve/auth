// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { useTable } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { DataTableToolbar } from './data-table-toolbar';
import { type DataTableColumnDef, dataTableFeatures } from './features';

interface Row {
  id: string;
  email: string;
  status: string;
}

const columns: DataTableColumnDef<Row>[] = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
];

const ToolbarHarness = ({
  title,
  preFilter,
}: {
  title?: string;
  preFilter?: { columnId: string; value: string };
}): ReactNode => {
  const table = useTable({
    features: dataTableFeatures,
    data: [{ id: '1', email: 'alice@example.com', status: 'active' }],
    columns,
    ...(title !== undefined && title !== '' ? { meta: { title } } : {}),
    ...(preFilter !== undefined
      ? { initialState: { columnFilters: [{ id: preFilter.columnId, value: preFilter.value }] } }
      : {}),
  });
  return (
    <div style={{ padding: 16 }}>
      <DataTableToolbar table={table} />
    </div>
  );
};

const meta: Meta<typeof ToolbarHarness> = {
  title: 'Auth/Data/DataTableToolbar',
  component: ToolbarHarness,
  parameters: {
    docs: {
      description: {
        component:
          'DataTableToolbar renders the table title (when set via `table.options.meta.title`), a Reset button when any column filter is active, and the Filter / View Options dropdowns.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ToolbarHarness>;

export const Default: Story = {
  args: {},
};

export const WithTitle: Story = {
  args: { title: 'Team Members' },
};

export const FilterActive: Story = {
  args: { title: 'Team Members', preFilter: { columnId: 'status', value: 'active' } },
};
