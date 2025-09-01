'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSchemas, useTables } from '@/data/schema/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DatabaseIcon, LayersIcon, LibraryIcon, PlusIcon, RefreshCcw, ScanEyeIcon, TableIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { DatabaseActionDialogs, type DatabaseAction } from './database-action-dialogs';
import { SQLConsoleDialog } from './sql-console-dialog';


export const DatabaseBrowser = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedSchema, setSelectedSchema] = React.useState<string | null>(searchParams.get('schema'));
  const [selectedTable, setSelectedTable] = React.useState<string | null>(searchParams.get('table'));
  const [dialogAction, setDialogAction] = React.useState<DatabaseAction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const { data: schemas, isLoading: schemasLoading, error: schemasError } = useSchemas();
  const { data: tables, isLoading: tablesLoading, error: tablesError, refetch: refetchTable, isRefetching: tableRefetching } = useTables(selectedSchema);

  // Update URL when schema/table changes
  const updateSearchParams = React.useCallback(
    (schema: string | null, table: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (schema) {
        params.set('schema', schema);
      } else {
        params.delete('schema');
      }

      if (table) {
        params.set('table', table);
      } else {
        params.delete('table');
      }

      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Auto-select the first schema when schemas are loaded
  React.useEffect(() => {
    if (schemas && schemas.length > 0 && !selectedSchema) {
      const firstSchema = schemas[0];
      setSelectedSchema(firstSchema);
      updateSearchParams(firstSchema, null);
    }
  }, [schemas, selectedSchema, updateSearchParams]);

  // Auto-select first table when tables are loaded
  React.useEffect(() => {
    if (tables && tables.length > 0 && selectedSchema && !selectedTable) {
      const firstTable = tables[0].name;
      setSelectedTable(firstTable);
      updateSearchParams(selectedSchema, firstTable);
    }
  }, [tables, selectedSchema, selectedTable, updateSearchParams]);

  const handleSchemaChange = (value: string) => {
    setSelectedSchema(value);
    setSelectedTable(null);
    updateSearchParams(value, null);
  };

  const handleTableClick = (tableName: string) => {
    setSelectedTable(tableName);
    updateSearchParams(selectedSchema, tableName);
  };

  const handleActionClick = (action: DatabaseAction) => {
    setDialogAction(action);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setDialogAction(null);
  };

  if (schemasError) {
    return <div className="p-4 text-sm text-destructive-primary">Error loading schemas: {schemasError.message}</div>;
  }

  return (
    <div className="flex flex-col space-y-2 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium sr-only">SQL console</label>
        <SQLConsoleDialog />
      </div>
      {/* Schema Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium sr-only">Schema</label>
        {schemasLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selectedSchema || undefined} onValueChange={handleSchemaChange}>
            <SelectTrigger className="w-full flex items-center gap-1">
              <div className="flex items-center gap-1">
                <DatabaseIcon />
                <SelectValue placeholder="Select a schema" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {schemas?.map(schema => (
                <SelectItem key={schema} value={schema}>
                  {schema}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Search table..." />
        <Button variant="outline" size="icon" onClick={() => refetchTable()} className="cursor-pointer">
          <span className="sr-only">Refresh table</span>
          {tableRefetching ? <Spinner /> : <RefreshCcw />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="cursor-pointer">
              <span className="sr-only">Action</span>
              <PlusIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-45">
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleActionClick('create-schema')}>
              <LayersIcon />
              Create schema
            </DropdownMenuItem>
            {/* <DropdownMenuItem className="cursor-pointer" onClick={() => handleActionClick('create-table')}>
              <TableIcon />
              Create table
            </DropdownMenuItem> */}
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleActionClick('create-view')}>
              <ScanEyeIcon />
              Create view
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => handleActionClick('create-enum')}>
              <LibraryIcon />
              Create enum
            </DropdownMenuItem>
            {/* <DropdownMenuItem className="cursor-pointer" onClick={() => handleActionClick('create-role')}>
              <FingerprintIcon />
              Create role
            </DropdownMenuItem> */}
            {/* <DropdownMenuItem className="cursor-pointer" onClick={() => handleActionClick('create-policy')}>
              <ScrollIcon />
              Create policy
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tables List */}
      {selectedSchema && (
        <div className="space-y-2">
          <label className="text-sm font-medium sr-only">Tables</label>
          {tablesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : tablesError ? (
            <div className="text-sm text-destructive">Error loading tables: {tablesError.message}</div>
          ) : tables && tables.length > 0 ? (
            <div className="space-y-1">
              {tables.map(table => (
                <Button key={table.name} size='sm' className="w-full justify-start cursor-pointer" variant={selectedTable === table.name ? 'secondary' : 'ghost'} onClick={() => handleTableClick(table.name)}>
                  <TableIcon />
                  <span className="truncate min-w-0">{table.name}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground h-full py-4  flex items-center justify-center">
              <div>
                No tables found in <span className="text-brand-magenta-primary">{selectedSchema}</span>
              </div>
            </div>
          )}
        </div>
      )
      }

      <DatabaseActionDialogs action={dialogAction} isOpen={isDialogOpen} onClose={handleDialogClose} selectedSchema={selectedSchema} />
    </div >
  );
};
