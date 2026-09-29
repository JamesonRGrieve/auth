'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import type { RowData } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { DataTableFilter } from './data-table-filter';
import { DataTableViewOptions } from './data-table-view-options';
import type { DataTableInstance } from './features';

interface DataTableToolbarProps<TData extends RowData> {
  table: DataTableInstance<TData>;
}

export function DataTableToolbar<TData extends RowData>({ table }: DataTableToolbarProps<TData>): React.JSX.Element {
  const isFiltered = table.store.state.columnFilters.length > 0;
  const title = table.options.meta?.title;

  return (
    <div className='flex items-center justify-end gap-2'>
      {title !== undefined && title !== '' && <h4 className='text-2xl font-bold mr-auto'>{title}</h4>}
      {isFiltered && (
        <Button variant='ghost' onClick={() => table.resetColumnFilters()} className='h-8 px-2 lg:px-3'>
          Reset
          <X />
        </Button>
      )}
      <DataTableFilter table={table} />
      <DataTableViewOptions table={table} />
    </div>
  );
}
