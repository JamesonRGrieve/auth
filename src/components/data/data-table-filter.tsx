'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@jgrieve/forms/components/ui/select';
import type { RowData } from '@tanstack/react-table';
import { Filter } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import type { DataTableInstance } from './features';

interface FilterState {
  column: string;
  value: string;
}

export function DataTableFilter<TData extends RowData>({ table }: { table: DataTableInstance<TData> }): React.JSX.Element {
  const columns = table.getAllColumns().filter((col) => col.getCanFilter());
  const [filter, setFilter] = useState<FilterState>({
    column: '',
    value: '',
  });

  const updateFilter = (key: keyof FilterState, value: string): void => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyFilter = (): void => {
    if (filter.column) {
      table.getColumn(filter.column)?.setFilterValue(filter.value);
    }
  };

  const resetFilter = (): void => {
    setFilter({
      column: '',
      value: '',
    });
    table.resetColumnFilters();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' className='rounded-lg'>
          <Filter className='w-4 h-4 mr-2' />
          Filter
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Filter Table</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='grid items-center grid-cols-4 gap-4'>
            <Label htmlFor='column' className='text-right'>
              Column
            </Label>
            <Select onValueChange={(value: string) => updateFilter('column', value)} value={filter.column}>
              <SelectTrigger className='col-span-3'>
                <SelectValue placeholder='Select Column' />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.columnDef.meta?.headerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid items-center grid-cols-4 gap-4'>
            <Label htmlFor='value' className='text-right'>
              Value
            </Label>
            <Input
              type='text'
              value={filter.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter('value', e.target.value)}
              placeholder='Enter filter value'
              className='col-span-3'
            />
          </div>
        </div>
        <DialogFooter className='flex justify-end mt-4 space-x-4'>
          <Button variant='destructive' size='sm' onClick={resetFilter}>
            Reset Filter
          </Button>
          <Button onClick={applyFilter} variant='default' size='sm'>
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
