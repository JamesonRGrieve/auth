// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Meta, StoryObj } from '@storybook/react';
import { useTable } from '@tanstack/react-table';
import { DataTableFilter } from './data-table-filter';
import { type DataTableColumnDef, dataTableFeatures } from './features';

interface Row {
  id: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
  role: string;
}

const columns: DataTableColumnDef<Row>[] = [
  { accessorKey: 'email', header: 'Email', enableColumnFilter: true },
  { accessorKey: 'status', header: 'Status', enableColumnFilter: true },
  { accessorKey: 'role', header: 'Role', enableColumnFilter: true },
];

const sampleRows: Row[] = [
  { id: '1', email: 'alice@example.com', status: 'active', role: 'Owner' },
  { id: '2', email: 'bob@example.com', status: 'pending', role: 'Member' },
];

// Storybook decorator wires up a real TanStack table so the filter dialog
// has columns to render. Without it the component crashes on getAllColumns.
function HostedFilter(): React.ReactElement {
  const table = useTable({ features: dataTableFeatures, data: sampleRows, columns });
  return <DataTableFilter table={table} />;
}

const meta: Meta<typeof HostedFilter> = {
  title: 'Auth/Data/DataTableFilter',
  component: HostedFilter,
  parameters: {
    docs: {
      description: {
        component:
          'DataTableFilter renders a dialog-launched column + value filter on top of a TanStack table. The story embeds it with a real table instance.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof HostedFilter>;

export const Default: Story = {
  args: {},
};
