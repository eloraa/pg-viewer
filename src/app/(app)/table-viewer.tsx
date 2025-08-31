'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTableColumns, useTableData } from '@/data/schema/schema';
import { DataTable, ExtendedColumnDef } from '@/components/data-table/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Column } from '@tanstack/react-table';

export function TableViewer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const schema = searchParams.get('schema');
  const table = searchParams.get('table');

  const { data: columns, isLoading: columnsLoading } = useTableColumns(schema, table);
  const { data: tableData, isLoading: dataLoading, error } = useTableData(schema, table);

  // Navigation handler for foreign key relationships
  const handleNavigateToForeignKey = React.useCallback((referencedSchema: string, referencedTable: string) => {
    const params = new URLSearchParams();
    params.set('schema', referencedSchema);
    params.set('table', referencedTable);
    router.push(`?${params.toString()}`);
  }, [router]);

  // Generate columns for the data table
  const dataColumns = React.useMemo<ExtendedColumnDef<unknown>[]>(() => {
    if (!columns) return [];
    
    console.log('Columns data in table viewer:', columns);

    const selectColumn: ExtendedColumnDef<unknown> = {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(!!value)} aria-label="Select row" />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const dataColumns = columns
      .filter(column => column.name && column.name.trim() !== '')
      .map(column => ({
        accessorKey: column.name,
        header: ({ column: tableColumn }: { column: Column<unknown, unknown> }) => (
          <DataTableColumnHeader 
            column={tableColumn} 
            title={column.name} 
            dataType={column.type}
          />
        ),
        cell: ({ row }: { row: any }) => {
          const value = row.getValue(column.name);

          // If this column has a foreign key, show it as a button
          if (column.foreignKey && value !== null) {
            return (
              <div className="flex items-center gap-2">
                <span className="break-all truncate">{String(value)}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-6 px-2 py-1 text-xs"
                  onClick={() => handleNavigateToForeignKey(column.foreignKey!.referencedSchema, column.foreignKey!.referencedTable)}
                >
                  {column.foreignKey.referencedTable}
                </Button>
              </div>
            );
          }

          // Handle different data types for display
          if (value === null) {
            return <span className="text-muted-foreground italic truncate">NULL</span>;
          }

          if (typeof value === 'boolean') {
            return <span className="font-mono truncate">{value.toString()}</span>;
          }

          if (typeof value === 'object') {
            return <span className="font-mono text-sm truncate">{JSON.stringify(value)}</span>;
          }

          return <span className="break-all truncate">{String(value)}</span>;
        },
        meta: {
          type: column.type,
          nullable: column.nullable,
        },
      }));

    return [selectColumn, ...dataColumns];
  }, [columns, handleNavigateToForeignKey]);

  if (!schema || !table) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No table selected</h2>
          <p className="text-muted-foreground">Select a schema and table from the sidebar to view its data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Error loading table data</h2>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
        </div>
      </div>
    );
  }

  if (columnsLoading || dataLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6 pb-4 border-b">
        <h1 className="text-2xl font-semibold mb-1">
          {schema}.{table}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tableData?.total || 0} rows • {columns?.length || 0} columns
        </p>
      </div>

      <div className="flex-1 overflow-hidden pt-4">
        {tableData && tableData.data.length > 0 ? (
          <DataTable
            columns={dataColumns}
            data={tableData.data}
            placeholder={`Search in ${table}...`}
            search={dataColumns
              .map(col => ({
                label: col.accessorKey || 'Unknown',
                value: col.accessorKey || '',
              }))
              .filter(item => item.value !== '')}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No data found</h3>
              <p className="text-muted-foreground">The table {table} appears to be empty.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
