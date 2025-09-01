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
import { type LucideIcon } from 'lucide-react';
import { DataTableSkeleton } from './data-table-skeleton';
import { EditableCell } from './editable-cell';

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

interface CellChange<TData> {
  row: TData;
  column: string;
  oldValue: unknown;
  newValue: unknown;
  rowIndex: number;
}

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
  isEditable?: boolean;
  onCellChange?: (changes: CellChange<TData>[]) => Promise<boolean>;
  resetTrigger?: number;
  toolbarClassName?: string;
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
  isEditable = false,
  onCellChange,
  resetTrigger,
  toolbarClassName,
}: DataTableProps<TData, TColumns>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  // Editing state
  const [activeCell, setActiveCell] = React.useState<{ rowIndex: number; columnId: string } | null>(null);
  const [editingCell, setEditingCell] = React.useState<{ rowIndex: number; columnId: string } | null>(null);
  const [pendingChanges, setPendingChanges] = React.useState<Map<string, CellChange<TData>>>(new Map());

  // Helper functions for cell editing
  const getCellKey = (rowIndex: number, columnId: string) => `${rowIndex}-${columnId}`;

  const isCellChanged = React.useCallback(
    (rowIndex: number, columnId: string) => {
      const cellKey = getCellKey(rowIndex, columnId);
      return pendingChanges.has(cellKey);
    },
    [pendingChanges]
  );

  const getCellValue = React.useCallback(
    (rowIndex: number, columnId: string, originalValue: unknown) => {
      const cellKey = getCellKey(rowIndex, columnId);
      const change = pendingChanges.get(cellKey);
      return change ? change.newValue : originalValue;
    },
    [pendingChanges]
  );

  const handleCellActivate = React.useCallback((rowIndex: number, columnId: string) => {
    setActiveCell({ rowIndex, columnId });
    setEditingCell(null);
  }, []);

  const handleCellEdit = React.useCallback((rowIndex: number, columnId: string) => {
    setActiveCell({ rowIndex, columnId });
    setEditingCell({ rowIndex, columnId });
  }, []);

  const handleCellChange = React.useCallback(
    (rowIndex: number, columnId: string, newValue: unknown) => {
      const row = data[rowIndex];
      const oldValue = (row as Record<string, unknown>)[columnId];

      if (oldValue !== newValue) {
        const cellKey = getCellKey(rowIndex, columnId);
        const change: CellChange<TData> = {
          row,
          column: columnId,
          oldValue,
          newValue,
          rowIndex,
        };

        setPendingChanges(prev => new Map(prev).set(cellKey, change));
      }
    },
    [data]
  );

  const handleCellSave = React.useCallback(() => {
    setEditingCell(null);
    setActiveCell(null);
  }, []);

  const handleCellCancel = React.useCallback(() => {
    setEditingCell(null);
  }, []);

  // Handle reset trigger from parent
  React.useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setPendingChanges(new Map());
      setActiveCell(null);
      setEditingCell(null);
    }
  }, [resetTrigger]);

  // Notify parent of changes asynchronously
  React.useEffect(() => {
    if (onCellChange && pendingChanges.size > 0) {
      const changesArray = Array.from(pendingChanges.values());
      onCellChange(changesArray);
    }
  }, [pendingChanges, onCellChange]);

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
        pageSizes={pageSizes}
        className={toolbarClassName}
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
                  <TableRow key={row.id} data-selected={row.getIsSelected()} className={(row.original as any)?.__isNew ? 'bg-brand-magenta-primary/5' : ''}>
                    {row.getVisibleCells().map((cell, _cellIndex) => {
                      const rowIndex = parseInt(row.id);
                      const columnId = cell.column.id;
                      const isSelectColumn = columnId === 'select';
                      const isForeignKeyColumn = columnId.startsWith('fk_');
                      const canEdit = isEditable && !isSelectColumn && !isForeignKeyColumn;
                      const isActive = activeCell?.rowIndex === rowIndex && activeCell?.columnId === columnId;
                      const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;

                      if (canEdit && 'accessorKey' in cell.column.columnDef && cell.column.columnDef.accessorKey) {
                        const accessorKey = cell.column.columnDef.accessorKey as string;
                        const originalValue = (cell.row.original as any)[accessorKey];
                        const currentValue = getCellValue(rowIndex, accessorKey, originalValue);
                        const isChangedCell = isCellChanged(rowIndex, accessorKey);
                        const dataType = (cell.column.columnDef.meta as any)?.type;
                        const nullable = (cell.column.columnDef.meta as any)?.nullable;

                        return (
                          <TableCell key={cell.id} className="p-0 max-w-60">
                            <div className="flex size-full relative">
                              <EditableCell
                                value={currentValue}
                                dataType={dataType}
                                nullable={nullable}
                                isActive={isActive}
                                isEditing={isEditing}
                                isChanged={isChangedCell}
                                onActivate={() => handleCellActivate(rowIndex, columnId)}
                                onEdit={() => handleCellEdit(rowIndex, columnId)}
                                onChange={newValue => handleCellChange(rowIndex, accessorKey, newValue)}
                                onSave={handleCellSave}
                                onCancel={handleCellCancel}
                                isEditable={canEdit}
                              />
                            </div>
                          </TableCell>
                        );
                      }

                      // For non-editable cells, use default rendering
                      return (
                        <TableCell key={cell.id} onClick={e => onClick?.(cell.row.original, e)} className="max-w-60">
                          <div className="flex min-w-0 overflow-hidden">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                        </TableCell>
                      );
                    })}
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
    </div>
  );
}
