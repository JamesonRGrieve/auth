// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  type CellContext,
  type Column,
  type ColumnDef,
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_arrIncludesAll,
  filterFn_arrIncludesSome,
  filterFn_equals,
  filterFn_equalsString,
  filterFn_inNumberRange,
  filterFn_includesString,
  filterFn_includesStringSensitive,
  filterFn_weakEquals,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  type RowData,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  type Table,
  tableFeatures,
} from '@tanstack/react-table';

/** Per-table meta: the heading the toolbar shows. */
export type DataTableMeta = { title?: string };
/** Per-column meta: the human label used by the filter and column-visibility menus. */
export type DataTableColumnMeta = { headerName?: string };

/**
 * The one feature set every DataTable in this package uses: selection, column visibility,
 * filtering (with faceted values for the filter popovers), sorting and pagination.
 * TanStack Table v8 bundled every built-in filter/sort function and columns rely on the
 * automatically chosen ones, so each built-in is registered under its conventional key.
 */
export const dataTableFeatures = tableFeatures({
  rowSelectionFeature,
  columnVisibilityFeature,
  columnFilteringFeature,
  columnFacetingFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns: {
    includesString: filterFn_includesString,
    includesStringSensitive: filterFn_includesStringSensitive,
    equalsString: filterFn_equalsString,
    arrIncludes: filterFn_arrIncludes,
    arrIncludesAll: filterFn_arrIncludesAll,
    arrIncludesSome: filterFn_arrIncludesSome,
    equals: filterFn_equals,
    weakEquals: filterFn_weakEquals,
    inNumberRange: filterFn_inNumberRange,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive,
    text: sortFn_text,
    textCaseSensitive: sortFn_textCaseSensitive,
    datetime: sortFn_datetime,
    basic: sortFn_basic,
  },
  tableMeta: metaHelper<DataTableMeta>(),
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;
export type DataTableColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<DataTableFeatures, TData, TValue>;
export type DataTableColumn<TData extends RowData, TValue = unknown> = Column<DataTableFeatures, TData, TValue>;
export type DataTableInstance<TData extends RowData> = Table<DataTableFeatures, TData>;
export type DataTableCellContext<TData extends RowData, TValue = unknown> = CellContext<DataTableFeatures, TData, TValue>;
