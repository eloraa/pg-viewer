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
import { RefreshButton } from '@/components/data-table/refresh-table';
import { FilterButton } from './filter-button';
import { FilterPanel } from './filter-panel';
import { scoreMatch } from '@/lib/search';

export function TableViewer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const schema = searchParams.get('schema');
  const table = searchParams.get('table');
  const { theme } = useTheme();
  const { isExpanded } = useSidebarStore();

  // Filter panel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<
    Array<{
      id: string;
      connector: 'where' | 'and' | 'or';
      column: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null';
      value: string;
    }>
  >([]);
  const [appliedFilters, setAppliedFilters] = React.useState<
    Array<{
      id: string;
      connector: 'where' | 'and' | 'or';
      column: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null';
      value: string;
    }>
  >([]);

  const { data: columns, isLoading: columnsLoading } = useTableColumns(schema, table);

  // Add pagination state
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const {
    data: tableData,
    isLoading: dataLoading,
    error,
    refetch: refetchTableData,
    isRefetching: isRefetchingTableData,
  } = useTableData(schema, table, appliedFilters, pagination.pageSize, pagination.pageIndex * pagination.pageSize);

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

    console.log('handleSaveChanges called with:', {
      isCreatingNew,
      pendingChanges: pendingChanges.length,
      schema,
      table,
    });

    // Debug: Check if any pending changes have __isNew marker
    pendingChanges.forEach((change, index) => {
      console.log(`Change ${index}:`, {
        hasIsNew: '__isNew' in change.row,
        rowKeys: Object.keys(change.row),
        rowData: change.row,
      });
    });

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
        console.log('Calling updateTableData with pending changes:', pendingChanges);
        const result = await updateTableData(schema, table, pendingChanges);

        if (result.success) {
          console.log('Update successful, clearing pending changes and refetching data');
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

  const tableDisplayData = React.useMemo(() => {
    const baseData = (tableData?.data as Record<string, unknown>[]) || [];
    if (isCreatingNew && newRowData) {
      return [newRowData, ...baseData];
    }
    return baseData;
  }, [tableData?.data, isCreatingNew, newRowData]);

  const createCustomFilterFn = (dataType: string) => {
    return (row: any, columnId: string, filterValue: string) => {
      if (!filterValue) return true;
      
      const value = row.getValue(columnId);
      const searchTerm = filterValue.toLowerCase().trim();
      
      // Handle null/undefined values with partial matching
      if (value === null || value === undefined) {
        // Check if search term is related to null (partial matching)
        const nullKeywords = ['null', 'nul', 'nu', 'n', 'empty', 'empt', 'emp', 'em', 'e', 'none', 'non', 'no'];
        return nullKeywords.some(keyword => keyword.includes(searchTerm) || searchTerm.includes(keyword));
      }
      
      // Convert value to string for searching
      let searchableValue: string;
      
      // Handle different data types
      switch (dataType) {
        case 'boolean':
          searchableValue = String(value).toLowerCase();
          // Allow partial matching for boolean values
          if (searchTerm === 't' || searchTerm === 'tr' || searchTerm === 'tru') {
            return searchableValue === 'true';
          }
          if (searchTerm === 'f' || searchTerm === 'fa' || searchTerm === 'fal' || searchTerm === 'fals') {
            return searchableValue === 'false';
          }
          return searchableValue.includes(searchTerm);
          
        case 'integer':
        case 'bigint':
        case 'numeric':
        case 'decimal':
        case 'real':
        case 'double precision':
          searchableValue = String(value).toLowerCase();
          return searchableValue.includes(searchTerm);
          
        case 'timestamp with time zone':
        case 'timestamp without time zone':
        case 'timestamptz':
        case 'timestamp':
        case 'date':
        case 'time':
          try {
            const dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
              searchableValue = String(value).toLowerCase();
            } else {
              // Search in multiple date formats
              const isoString = dateValue.toISOString().toLowerCase();
              const localString = dateValue.toLocaleString().toLowerCase();
              const dateString = dateValue.toDateString().toLowerCase();
              searchableValue = `${isoString} ${localString} ${dateString}`;
            }
          } catch {
            searchableValue = String(value).toLowerCase();
          }
          return searchableValue.includes(searchTerm);
          
        case 'json':
        case 'jsonb':
          try {
            const jsonString = JSON.stringify(value).toLowerCase();
            searchableValue = jsonString;
          } catch {
            searchableValue = String(value).toLowerCase();
          }
          return searchableValue.includes(searchTerm);
          
        default:
          // For text types and others, use fuzzy matching for better results
          searchableValue = String(value).toLowerCase();
          
          // First try simple includes for exact matches (fastest)
          if (searchableValue.includes(searchTerm)) {
            return true;
          }
          
          // Then use advanced fuzzy matching for partial matches
          const fuzzyScore = scoreMatch(searchableValue, searchTerm);
          // Use a lower threshold for fuzzy matching to be more permissive
          return fuzzyScore >= 0.1;
      }
    };
  };

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
      .filter(column => typeof column.name === 'string' && column.name.trim() !== '' && column.name !== 'ctid')
      .forEach(column => {
        // Add the regular data column
        dataColumns.push({
          accessorKey: column.name as string,
          header: ({ column: tableColumn }) => <DataTableColumnHeader column={tableColumn} title={column.name as string} dataType={column.type as string} />,
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
          filterFn: createCustomFilterFn(column.type as string),
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

  return (
    <>
      <div className="flex-1 overflow-hidden py-1 h-full flex">
        <div className="overflow-y-auto w-full">
          <DataTable
            columns={dataColumns}
            data={tableDisplayData}
            placeholder={`Search in ${table}...`}
            toolbarClassName={cn(isExpanded ? 'md:pr-14' : 'md:pl-4 md:pr-4.5')}
            search={dataColumns
              .filter(col => 
                col.accessorKey && 
                col.accessorKey.trim() !== '' && 
                !col.accessorKey.startsWith('fk_') && // Exclude foreign key columns
                col.accessorKey !== 'ctid' // Exclude ctid column from search
              )
              .map(col => ({
                label: col.accessorKey!,
                value: col.accessorKey!,
              }))}
            isEditable={true}
            isLoading={isRefetchingTableData || dataLoading}
            onCellChange={handleCellChange}
            resetTrigger={resetTrigger}
            pagination={pagination}
            pageCount={tableData ? Math.ceil(tableData.total / pagination.pageSize) : 0}
            onPaginationChange={newPagination => {
              // Update local pagination state
              setPagination(newPagination);
            }}
            onSelectionChange={setSelectedRows}
            onTableInstance={setTableInstance}
            customFilter={[
              {
                filter: RefreshButton,
                label: 'Refresh',
                props: { onClick: refetchTableData, isLoading: isRefetchingTableData || dataLoading },
              },
              {
                filter: FilterButton,
                label: 'Filter',
                props: {
                  isActive: isFilterPanelOpen,
                  onClick: () => {
                    const newState = !isFilterPanelOpen;
                    setIsFilterPanelOpen(newState);

                    // Add default filter when opening panel for the first time
                    if (newState && filters.length === 0 && columns && columns.length > 0) {
                      const defaultFilter = {
                        id: `filter_${Date.now()}`,
                        connector: 'where' as const,
                        column: columns[0].name,
                        operator: 'equals' as const,
                        value: '',
                      };
                      setFilters([defaultFilter]);
                    }
                  },
                },
              },
              {
                filter: CreateNewFilter,
                label: 'Create New',
                props: {
                  onCreateNew: handleCreateNew,
                  disabled: isCreatingNew || isProcessingChanges,
                },
              },
            ]}
            appendNodeToToolbar={{
              bottom: isFilterPanelOpen ? (
                <FilterPanel
                  columns={columns?.map(col => ({ name: col.name, type: col.type })) || []}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={() => {
                    setFilters([]);
                    setAppliedFilters([]);
                  }}
                  onApplyFilters={() => {
                    setAppliedFilters([...filters]);
                  }}
                />
              ) : null,
            }}
            selectActions={
              selectedRows && selectedRows.length > 0 && tableInstance && schema && table && !isCreatingNew ? (
                <Actions data={selectedRows} table={tableInstance} schema={schema} tableName={table} />
              ) : null
            }
          />
        </div>
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
