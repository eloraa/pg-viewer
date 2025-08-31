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
import { updateTableData } from '@/lib/server/actions';

export function TableViewer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const schema = searchParams.get('schema');
  const table = searchParams.get('table');

  const { data: columns, isLoading: columnsLoading } = useTableColumns(schema, table);
  const { data: tableData, isLoading: dataLoading, error, refetch: refetchTableData } = useTableData(schema, table);
  
  // State for tracking cell changes
  const [pendingChanges, setPendingChanges] = React.useState<Array<{
    row: any;
    column: string;
    oldValue: any;
    newValue: any;
    rowIndex: number;
  }>>([]);
  const [isProcessingChanges, setIsProcessingChanges] = React.useState(false);
  const [resetTrigger, setResetTrigger] = React.useState(0);

  // Handler for cell changes
  const handleCellChange = React.useCallback(async (changes: Array<{
    row: any;
    column: string;
    oldValue: any;
    newValue: any;
    rowIndex: number;
  }>) => {
    setPendingChanges(changes);
    return true; // Return true to indicate the change was accepted
  }, []);

  // Handler for saving changes
  const handleSaveChanges = React.useCallback(async () => {
    if (!schema || !table || pendingChanges.length === 0) return;

    setIsProcessingChanges(true);
    try {
      const result = await updateTableData(schema, table, pendingChanges);
      
      if (result.success) {
        setPendingChanges([]);
        setResetTrigger(prev => prev + 1); // Reset DataTable state
        // Refetch table data to show updated values
        refetchTableData();
      } else {
        console.error('Error saving changes:', result.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsProcessingChanges(false);
    }
  }, [schema, table, pendingChanges, refetchTableData]);

  // Handler for discarding changes
  const handleDiscardChanges = React.useCallback(() => {
    setPendingChanges([]);
    setResetTrigger(prev => prev + 1); // Trigger reset in DataTable
  }, []);

  // Navigation handler for foreign key relationships
  const handleNavigateToForeignKey = React.useCallback(
    (referencedSchema: string, referencedTable: string) => {
      const params = new URLSearchParams();
      params.set('schema', referencedSchema);
      params.set('table', referencedTable);
      router.push(`?${params.toString()}`);
    },
    [router]
  );

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

    // Create columns with FK reference columns placed after their related data columns
    const dataColumns: ExtendedColumnDef<unknown>[] = [];

    columns
      .filter(column => column.name && column.name.trim() !== '')
      .forEach(column => {
        // Add the regular data column
        dataColumns.push({
          accessorKey: column.name,
          header: ({ column: tableColumn }: { column: Column<unknown, unknown> }) => <DataTableColumnHeader column={tableColumn} title={column.name} dataType={column.type} />,
          cell: ({ row }: { row: any }) => {
            const value = row.getValue(column.name);

            // Handle different data types for display (no foreign key logic here)
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
        });

        if (column.foreignKey) {
          dataColumns.push({
            id: `fk_${column.name}_${column.foreignKey.referencedTable}`,
            header: () => <span>{column.foreignKey!.referencedTable}</span>,
            cell: () => (
              <Button
                variant="secondary"
                size="sm"
                className="h-6 px-2 py-1 text-xs cursor-pointer"
                onClick={() => handleNavigateToForeignKey(column.foreignKey!.referencedSchema, column.foreignKey!.referencedTable)}
              >
                {column.foreignKey!.referencedTable}
              </Button>
            ),
            enableSorting: false,
            enableHiding: true,
          });
        }
      });

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
            isEditable={true}
            onCellChange={handleCellChange}
            resetTrigger={resetTrigger}
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

      {/* Fixed bottom bar for save/discard changes */}
      {pendingChanges.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg p-4 z-50">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {pendingChanges.length} unsaved {pendingChanges.length === 1 ? 'change' : 'changes'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleDiscardChanges}
                disabled={isProcessingChanges}
              >
                Discard Changes
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={isProcessingChanges}
              >
                {isProcessingChanges ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
