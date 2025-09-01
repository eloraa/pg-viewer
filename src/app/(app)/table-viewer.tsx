'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTableColumns, useTableData } from '@/data/schema/schema';
import { DataTable, type ExtendedColumnDef } from '@/components/data-table/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table } from '@tanstack/react-table';
import { XIcon } from 'lucide-react';
import { updateTableData, insertTableRow } from '@/lib/server/actions';
import { Actions } from './actions';
import { CreateNewFilter } from './create-new-filter';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Editor } from '@/components/ui/editor';
import { useTheme } from '@/store/theme';
import { useSidebarStore } from '@/store/sidebar';
import { cn } from '@/lib/utils';

export function TableViewer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const schema = searchParams.get('schema');
  const table = searchParams.get('table');
  const { theme } = useTheme();
  const { isExpanded } = useSidebarStore();

  const { data: columns, isLoading: columnsLoading } = useTableColumns(schema, table);
  const { data: tableData, isLoading: dataLoading, error, refetch: refetchTableData } = useTableData(schema, table);

  // State for tracking cell changes
  const [pendingChanges, setPendingChanges] = React.useState<
    Array<{
      row: Record<string, unknown>;
      column: string;
      oldValue: unknown;
      newValue: unknown;
      rowIndex: number;
    }>
  >([]);
  const [isProcessingChanges, setIsProcessingChanges] = React.useState(false);
  const [resetTrigger, setResetTrigger] = React.useState(0);

  // State for selected rows and table instance
  const [selectedRows, setSelectedRows] = React.useState<Record<string, unknown>[]>([]);
  const [tableInstance, setTableInstance] = React.useState<Table<Record<string, unknown>> | null>(null);

  // State for new row creation
  const [isCreatingNew, setIsCreatingNew] = React.useState(false);
  const [newRowData, setNewRowData] = React.useState<Record<string, unknown> | null>(null);

  // State for error dialog
  const [errorDialog, setErrorDialog] = React.useState<{
    show: boolean;
    title: string;
    message: string;
    sqlQuery?: string;
  }>({
    show: false,
    title: '',
    message: '',
  });

  // Helper to show error dialog
  const showError = React.useCallback((title: string, message: string, sqlQuery?: string) => {
    setErrorDialog({
      show: true,
      title,
      message,
      sqlQuery,
    });
  }, []);

  // Handler for cell changes
  const handleCellChange = React.useCallback(
    async (
      changes: Array<{
        row: Record<string, unknown>;
        column: string;
        oldValue: unknown;
        newValue: unknown;
        rowIndex: number;
      }>
    ) => {
      setPendingChanges(changes);
      return true; // Return true to indicate the change was accepted
    },
    []
  );

  // Handler for saving changes
  const handleSaveChanges = React.useCallback(async () => {
    if (!schema || !table) return;

    // Check if we're creating a new row or updating existing ones
    if (isCreatingNew && newRowData && pendingChanges.length > 0) {
      // Creating new row
      setIsProcessingChanges(true);
      try {
        // Build row data from pending changes
        const rowData: Record<string, unknown> = { ...newRowData };
        pendingChanges.forEach(change => {
          rowData[change.column] = change.newValue;
        });

        // Remove the __isNew marker
        delete rowData.__isNew;

        const result = await insertTableRow(schema, table, rowData);

        if (result.success) {
          setPendingChanges([]);
          setIsCreatingNew(false);
          setNewRowData(null);
          setResetTrigger(prev => prev + 1);
          refetchTableData();
        } else {
          showError('Error Creating Row', result.error || 'Failed to create new row', (result as { sqlQuery?: string }).sqlQuery);
        }
      } catch (error) {
        showError('Error Creating Row', error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setIsProcessingChanges(false);
      }
    } else if (pendingChanges.length > 0) {
      // Updating existing rows
      setIsProcessingChanges(true);
      try {
        const result = await updateTableData(schema, table, pendingChanges);

        if (result.success) {
          setPendingChanges([]);
          setResetTrigger(prev => prev + 1);
          refetchTableData();
        } else {
          showError('Error Saving Changes', result.error || 'Failed to save changes');
        }
      } catch (error) {
        showError('Error Saving Changes', error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setIsProcessingChanges(false);
      }
    }
  }, [schema, table, pendingChanges, refetchTableData, isCreatingNew, newRowData, showError]);

  // Handler for discarding changes
  const handleDiscardChanges = React.useCallback(() => {
    setPendingChanges([]);
    setIsCreatingNew(false);
    setNewRowData(null);
    setResetTrigger(prev => prev + 1); // Trigger reset in DataTable
  }, []);

  // Handler for creating new row
  const handleCreateNew = React.useCallback(() => {
    if (!columns) return;

    // Create empty new row with default values
    const emptyRow: Record<string, unknown> = { __isNew: true };
    columns.forEach(col => {
      if (col.name && col.name !== 'id') {
        // Don't include auto-increment fields
        emptyRow[col.name as string] = '';
      }
    });

    setNewRowData(emptyRow);
    setIsCreatingNew(true);
    setSelectedRows([]); // Clear any selected rows
    tableInstance?.toggleAllRowsSelected(false);
  }, [columns, tableInstance]);

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

  // Prepare table data including new row if creating
  const tableDisplayData = React.useMemo(() => {
    const baseData = (tableData?.data as Record<string, unknown>[]) || [];
    if (isCreatingNew && newRowData) {
      return [newRowData, ...baseData];
    }
    return baseData;
  }, [tableData?.data, isCreatingNew, newRowData]);

  // Generate columns for the data table
  const dataColumns = React.useMemo(() => {
    if (!columns) return [];

    console.log('Columns data in table viewer:', columns);

    const selectColumn: ExtendedColumnDef<Record<string, unknown>> = {
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
      cell: ({ row }) => {
        const isNewRow = (row.original as Record<string, unknown>)?.__isNew;

        if (isNewRow) {
          return (
            <div className="flex items-center justify-center">
              <Button size="sm" variant="ghost" className="p-0 flex items-center w-full justify-center" onClick={handleDiscardChanges}>
                <XIcon className="size-4" />
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-center">
            <Checkbox checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(!!value)} aria-label="Select row" />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    };

    // Create columns with FK reference columns placed after their related data columns
    const dataColumns: ExtendedColumnDef<Record<string, unknown>>[] = [];

    columns
      .filter(column => typeof column.name === 'string' && column.name.trim() !== '')
      .forEach(column => {
        // Add the regular data column
        dataColumns.push({
          accessorKey: column.name as string,
          header: ({ column: tableColumn }) => (
            <DataTableColumnHeader column={tableColumn} title={column.name as string} dataType={column.type as string} />
          ),
          cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
            const value = row.getValue(column.name as string);

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
          const fkColumn: ExtendedColumnDef<Record<string, unknown>> = {
            id: `fk_${column.name}_${column.foreignKey.referencedTable}`,
            header: () => <span>{column.foreignKey!.referencedTable}</span>,
            cell: () => (
              <div className="px-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 py-1 text-xs cursor-pointer"
                  onClick={() => handleNavigateToForeignKey(column.foreignKey!.referencedSchema, column.foreignKey!.referencedTable)}
                >
                  {column.foreignKey!.referencedTable}
                </Button>
              </div>
            ),
            accessorKey: `fk_${column.name}`,
            enableSorting: false,
            enableHiding: true,
          };
          dataColumns.push(fkColumn);
        }
      });

    return [selectColumn, ...dataColumns];
  }, [columns, handleNavigateToForeignKey, handleDiscardChanges]);

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
    <>
      <div className="flex-1 overflow-hidden pt-1">
        <DataTable
          columns={dataColumns}
          data={tableDisplayData}
          placeholder={`Search in ${table}...`}
          toolbarClassName={cn(isExpanded ? 'pr-14' : 'pl-4 pr-4.5')}
          search={dataColumns
            .map(col => ({
              label: col.accessorKey || 'Unknown',
              value: col.accessorKey || '',
            }))
            .filter(item => item.value !== '')}
          isEditable={true}
          onCellChange={handleCellChange}
          resetTrigger={resetTrigger}
          onSelectionChange={setSelectedRows}
          onTableInstance={setTableInstance}
          customFilter={[
            {
              filter: CreateNewFilter,
              label: 'Create New',
              props: {
                onCreateNew: handleCreateNew,
                disabled: isCreatingNew || isProcessingChanges,
              },
            },
          ]}
          selectActions={
            selectedRows && selectedRows.length > 0 && tableInstance && schema && table && !isCreatingNew ? (
              <Actions data={selectedRows} table={tableInstance} schema={schema} tableName={table} />
            ) : null
          }
        />
      </div>

      {/* Fixed bottom bar for save/discard changes */}
      {(pendingChanges.length > 0 || isCreatingNew) && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg p-4 z-50">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isCreatingNew
                  ? pendingChanges.length > 0
                    ? `Creating new row (${pendingChanges.length} ${pendingChanges.length === 1 ? 'field' : 'fields'} filled)`
                    : 'Creating new row'
                  : `${pendingChanges.length} unsaved ${pendingChanges.length === 1 ? 'change' : 'changes'}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleDiscardChanges} disabled={isProcessingChanges}>
                Discard Changes
              </Button>
              <Button onClick={handleSaveChanges} disabled={isProcessingChanges || (isCreatingNew && pendingChanges.length === 0)}>
                {isProcessingChanges ? (isCreatingNew ? 'Creating...' : 'Saving...') : isCreatingNew ? 'Create Row' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Dialog */}
      <Dialog open={errorDialog.show} onOpenChange={show => setErrorDialog(prev => ({ ...prev, show }))}>
        <DialogContent className="md:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-destructive-primary flex items-center gap-2">
              <XIcon className="h-5 w-5" />
              {errorDialog.title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4 min-h-0">
            {/* Error Message */}
            <div className="text-sm text-muted-foreground">{errorDialog.message}</div>

            {/* SQL Query Display */}
            {errorDialog.sqlQuery && (
              <div className="flex-1 min-h-[400px] overflow-hidden">
                <Editor
                  value={errorDialog.sqlQuery}
                  onChange={() => {}} // Read-only
                  language="sql"
                  height="400px"
                  options={{
                    readOnly: true,
                    fontSize: 12,
                    lineNumbers: 'on',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    theme: theme === 'dark' ? 'vs-dark' : 'vs',
                    inlayHints: { enabled: 'off' },
                    padding: { top: 8, bottom: 8 },
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setErrorDialog(prev => ({ ...prev, show: false }))} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
