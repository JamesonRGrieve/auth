// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { Separator } from '@jgrieve/forms/components/ui/separator';
import type { RowData } from '@tanstack/react-table';
import { Check, PlusCircle } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import type { DataTableColumn } from './features';

interface DataTableFacetedFilterProps<TData extends RowData, TValue> {
  column?: DataTableColumn<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export function DataTableFacetedFilter<TData extends RowData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>): React.JSX.Element {
  const facets = column?.getFacetedUniqueValues();
  const filterValue = column?.getFilterValue();
  // The filter value is the array of option values this component sets below.
  const selectedValues = new Set<string>(Array.isArray(filterValue) ? filterValue.map(String) : []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-8 border-dashed'>
          <PlusCircle />
          {title}
          {selectedValues.size > 0 && (
            <>
              <Separator orientation='vertical' className='h-4 mx-2' />
              <Badge variant='secondary' className='px-1 font-normal rounded-sm lg:hidden'>
                {selectedValues.size}
              </Badge>
              <div className='hidden space-x-1 lg:flex'>
                {selectedValues.size > 2 ? (
                  <Badge variant='secondary' className='px-1 font-normal rounded-sm'>
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge variant='secondary' key={option.value} className='px-1 font-normal rounded-sm'>
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[200px] p-0' align='start'>
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(filterValues.length ? filterValues : undefined);
                    }}
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <Check />
                    </div>
                    {option.icon && <option.icon className='w-4 h-4 mr-2 text-muted-foreground' />}
                    <span>{option.label}</span>
                    {(facets?.get(option.value) ?? 0) > 0 && (
                      <span className='flex items-center justify-center w-4 h-4 ml-auto font-mono text-xs'>
                        {facets?.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => column?.setFilterValue(undefined)} className='justify-center text-center'>
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
