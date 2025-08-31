'use client';

import * as React from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
  type OnChangeFn,
} from '@tanstack/react-table';
import { DataTableToolbar } from './data-table-toolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';
import { type LucideIcon } from 'lucide-react';
import { DataTableSkeleton } from './data-table-skeleton';

interface CustomRowProps<TData> {
  row: Row<TData>;
  customState: unknown;
  onClick?: (row: TData) => void;
}

const CustomRow = <TData,>({ row, customState, onClick }: CustomRowProps<TData>) => {
  const [state, setState] = React.useState(customState);

  return (
    <TableRow key={row.id} data-selected={row.getIsSelected()}>
      {row.getVisibleCells().map(cell => (
        <TableCell key={cell.id} onClick={() => onClick?.(cell.row.original)} className="max-w-60 overflow-hidden">
          <div className="flex min-w-0 overflow-hidden">{flexRender(cell.column.columnDef.cell, { ...cell.getContext(), state, setState })}</div>
        </TableCell>
      ))}
    </TableRow>
  );
};

export interface CustomFilterProps {
  className?: string;
  label?: string;
  [key: string]: unknown;
}

interface FilterWithItem {
  label: string;
  value: string;
  defaultValue?: string;
  icon?: LucideIcon;
  options: Array<{
    label: string;
    value: string;
  }>;
}

type ExtractColumnKeys<T> = T extends { accessorKey: infer K } ? (K extends string ? K : never) : never;

export type ExtendedColumnDef<TData> = ColumnDef<TData> & {
  columnVisibility?: (data: TData[]) => boolean;
  accessorKey?: string;
};

interface DataTableProps<TData, TColumns extends ExtendedColumnDef<TData>[]> {
  columns: TColumns;
  data: TData[];
  onClick?: (row: TData, event?: React.MouseEvent) => void;
  placeholder?: string;
  filterWith?: FilterWithItem | FilterWithItem[];
  statuses?: Array<{ label: string; value: string }>;
  defaultStatus?: string;
  customState?: unknown;
  search?: ExtractColumnKeys<TColumns[number]> | ExtractColumnKeys<TColumns[number]>[] | Array<{ value: ExtractColumnKeys<TColumns[number]>; label: string; input?: React.ReactNode }>;
  dateFilter?: boolean;
  customFilter?: Array<{
    filter: React.ComponentType<CustomFilterProps>;
    label: string;
    props?: Record<string, unknown>;
  }>;
  selectActions?: React.ReactNode | React.ReactNode[];
  onSelectionChange?: (selectedRows: TData[]) => void;
  onTableInstance?: (table: ReturnType<typeof useReactTable<TData>>) => void;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  pageCount?: number;
  pageSizes?: number[];
  isLoading?: boolean;
}

export function DataTable<TData, TColumns extends ExtendedColumnDef<TData>[] = ExtendedColumnDef<TData>[]>({
  columns,
  data,
  onClick,
  placeholder,
  filterWith,
  statuses = [],
  defaultStatus,
  customState,
  search,
  dateFilter,
  customFilter,
  selectActions,
  onSelectionChange,
  onTableInstance,
  onPaginationChange,
  pagination,
  pageCount,
  pageSizes = [10, 20, 30],
  isLoading = false,
}: DataTableProps<TData, TColumns>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const dynamicVisibility = columns.reduce((acc, column) => {
      if (column.columnVisibility && column.accessorKey) {
        acc[column.accessorKey] = column.columnVisibility(data);
      }
      return acc;
    }, {} as VisibilityState);

    setColumnVisibility(prev => ({
      ...prev,
      ...dynamicVisibility,
    }));
  }, [columns, data]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      rowSelection,
      pagination: {
        pageIndex: pagination?.pageIndex ?? 0,
        pageSize: pagination?.pageSize ?? 10,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),

    onPaginationChange: onPaginationChange,
    pageCount: pageCount,
    manualPagination: true,
  });

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table
        .getFilteredRowModel()
        .rows.filter(row => rowSelection[row.id as string])
        .map(row => row.original as TData);

      onSelectionChange(selectedRows);
    }
  }, [rowSelection, table, onSelectionChange]);

  React.useEffect(() => {
    if (onTableInstance) {
      onTableInstance(table);
    }
  }, [table, onTableInstance]);

  if (isLoading) return <DataTableSkeleton />;

  return (
    <div className="space-y-2">
      <DataTableToolbar<TData>
        filterWith={filterWith}
        defaultStatus={defaultStatus}
        customFilter={customFilter}
        dateFilter={dateFilter}
        id={search}
        statuses={statuses}
        table={table}
        placeholder={placeholder}
        selectActions={selectActions}
      />
      <div>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row =>
                customState !== undefined ? (
                  <CustomRow<TData> key={row.id} row={row} customState={customState} onClick={onClick} />
                ) : (
                  <TableRow key={row.id} data-selected={row.getIsSelected()}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} onClick={e => onClick?.(cell.row.original, e)} className="max-w-60">
                        <div className="flex min-w-0 overflow-hidden">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} pageSizes={pageSizes} />
    </div>
  );
}
