'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { createView } from '@/lib/server/actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTables, useTableColumns, useSchemas, type DatabaseTable, type DatabaseColumn } from '@/data/schema/schema';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ChevronDownIcon, XIcon } from 'lucide-react';

const viewSchema = z.object({
  schemaName: z.string().min(1, { message: 'Schema is required.' }),
  viewName: z
    .string()
    .min(1, { message: 'View name is required.' })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
      message: 'View name must start with a letter or underscore and contain only letters, numbers, and underscores.',
    }),
  selectedTable: z.string().optional(),
  selectedColumns: z.array(z.string()),
  conditions: z.array(
    z.object({
      column: z.string(),
      operator: z.string(),
      value: z.string(),
    })
  ),
  query: z.string().min(1, { message: 'SQL query is required.' }),
});

interface CreateViewFormProps {
  schemaName: string;
  className?: string;
  onSuccess?: () => void;
}

export function CreateViewForm({ schemaName, className, onSuccess }: CreateViewFormProps) {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<string>('');

  const { data: schemas } = useSchemas();

  const operators = [
    { value: '=', label: 'equals (=)' },
    { value: '<>', label: 'not equals (<>)' },
    { value: '>', label: 'greater (>)' },
    { value: '>=', label: 'greater or equals (>=)' },
    { value: '<', label: 'less (<)' },
    { value: '<=', label: 'less or equals (<=)' },
    { value: 'LIKE', label: 'like (LIKE)' },
    { value: 'ILIKE', label: 'ilike (ILIKE)' },
    { value: 'NOT LIKE', label: 'not like (NOT LIKE)' },
    { value: 'IN', label: 'in (IN)' },
    { value: 'IS NULL', label: 'is null (IS NULL)' },
    { value: 'IS NOT NULL', label: 'is not null (IS NOT NULL)' },
  ];

  const form = useForm<z.infer<typeof viewSchema>>({
    resolver: zodResolver(viewSchema),
    defaultValues: {
      schemaName: schemaName,
      viewName: '',
      selectedTable: '',
      selectedColumns: [],
      conditions: [],
      query: '',
    },
  });

  // Watch the current schema from the form
  const currentSchema = form.watch('schemaName');
  const { data: tables, isLoading: tablesLoading } = useTables(currentSchema);
  const { data: columns, isLoading: columnsLoading } = useTableColumns(currentSchema, selectedTable);

  // Clear table and columns when schema changes
  React.useEffect(() => {
    if (currentSchema !== schemaName) {
      setSelectedTable('');
      form.setValue('selectedTable', '');
      form.setValue('selectedColumns', []);
      form.setValue('conditions', []);
      form.setValue('query', '');
    }
  }, [currentSchema, schemaName, form]);

  const createViewMutation = useMutation({
    mutationFn: async (data: {
      schemaName: string;
      viewName: string;
      selectedTable?: string;
      selectedColumns: string[];
      conditions: Array<{ column: string; operator: string; value: string }>;
      query: string;
    }) => {
      return createView(data.schemaName, data.viewName, data.query);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', schemaName] });
      form.reset();
      setSelectedTable('');
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        toast.error(error.message);
        form.setError('viewName', {
          type: 'server',
          message: (error as { message: string }).message,
        });
      }
    },
  });

  function onSubmit(values: z.infer<typeof viewSchema>) {
    toast.promise(createViewMutation.mutateAsync(values), {
      loading: 'Creating view...',
      success: 'View created successfully',
      error: (err: unknown) => {
        if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
          return (err as { message: string }).message;
        }
        return 'Failed to create view';
      },
    });
  }

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    form.setValue('selectedTable', tableName);

    // Generate a basic SELECT query for the selected table
    if (columns && columns.length > 0) {
      const typedColumns = columns as DatabaseColumn[];
      const columnNames = typedColumns.map(col => `"${col.name}"`).join(', ');
      const basicQuery = `SELECT ${columnNames}\nFROM "${form.getValues('schemaName')}"."${tableName}"`;
      form.setValue('query', basicQuery);
      // Select all columns by default
      form.setValue(
        'selectedColumns',
        typedColumns.map(col => col.name)
      );
      // Clear conditions when table changes
      form.setValue('conditions', []);
    }
  };

  const handleColumnToggle = (columnName: string) => {
    const currentColumns = form.getValues('selectedColumns');
    const isSelected = currentColumns.includes(columnName);

    let newColumns: string[];
    if (isSelected) {
      newColumns = currentColumns.filter(col => col !== columnName);
    } else {
      newColumns = [...currentColumns, columnName];
    }

    form.setValue('selectedColumns', newColumns);

    // Update the query with selected columns
    if (selectedTable && newColumns.length > 0) {
      const columnNames = newColumns.map(col => `"${col}"`).join(', ');
      const updatedQuery = `SELECT ${columnNames}\nFROM "${form.getValues('schemaName')}"."${selectedTable}"`;
      form.setValue('query', updatedQuery);
    }
  };

  // const _insertColumnIntoQuery = (columnName: string) => {
  //   const currentQuery = form.getValues('query');
  //   const cursorPosition = (document.querySelector('textarea[name="query"]') as HTMLTextAreaElement)?.selectionStart || currentQuery.length;

  //   const beforeCursor = currentQuery.slice(0, cursorPosition);
  //   const afterCursor = currentQuery.slice(cursorPosition);

  //   const newQuery = beforeCursor + `"${columnName}"` + afterCursor;
  //   form.setValue('query', newQuery);
  // };

  const addCondition = () => {
    const currentConditions = form.getValues('conditions');
    const newCondition = { column: '', operator: '=', value: '' };
    form.setValue('conditions', [...currentConditions, newCondition]);
    updateQueryWithConditions([...currentConditions, newCondition]);
  };

  const removeCondition = (index: number) => {
    const currentConditions = form.getValues('conditions');
    const newConditions = currentConditions.filter((_, i) => i !== index);
    form.setValue('conditions', newConditions);
    updateQueryWithConditions(newConditions);
  };

  const updateCondition = (index: number, field: 'column' | 'operator' | 'value', value: string) => {
    const currentConditions = form.getValues('conditions');
    const newConditions = [...currentConditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    form.setValue('conditions', newConditions);
    updateQueryWithConditions(newConditions);
  };

  const updateQueryWithConditions = (conditions: Array<{ column: string; operator: string; value: string }>) => {
    const selectedColumns = form.getValues('selectedColumns');
    const selectedTable = form.getValues('selectedTable');
    const schemaName = form.getValues('schemaName');

    if (!selectedTable || selectedColumns.length === 0) return;

    let query = `SELECT ${selectedColumns.map(col => `"${col}"`).join(', ')}\nFROM "${schemaName}"."${selectedTable}"`;

    if (conditions.length > 0 && conditions.some(c => c.column && c.operator)) {
      const validConditions = conditions
        .filter(c => c.column && c.operator)
        .map(c => {
          if (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') {
            return `"${c.column}" ${c.operator}`;
          } else if (c.operator === 'IN') {
            return `"${c.column}" ${c.operator} (${c.value})`;
          } else {
            return `"${c.column}" ${c.operator} '${c.value}'`;
          }
        })
        .join(' AND ');

      if (validConditions) {
        query += `\nWHERE ${validConditions}`;
      }
    }

    form.setValue('query', query);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
        {/* Top row with Schema, View Name, Table, and Columns */}
        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="schemaName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schema</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {schemas?.map(schema => (
                        <SelectItem key={schema} value={schema}>
                          {schema}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="viewName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>View Name</FormLabel>
                <FormControl>
                  <Input className="w-full" placeholder="Enter view name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="selectedTable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Table</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={value => {
                      field.onChange(value);
                      handleTableSelect(value);
                    }}
                    disabled={tablesLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tablesLoading ? 'Loading...' : 'Select table'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(tables as DatabaseTable[])?.map(table => (
                        <SelectItem key={table.name} value={table.name}>
                          {table.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="selectedColumns"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Columns</FormLabel>
                <FormControl>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full" asChild>
                      <Button variant="outline" className="w-full justify-between" disabled={!selectedTable || columnsLoading}>
                        {field.value.length > 0 ? `${field.value.length} selected` : columnsLoading ? 'Loading...' : 'Select columns'}
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 max-h-60 overflow-y-auto z-50">
                      <DropdownMenuLabel>Select Columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(columns as DatabaseColumn[])?.map(column => (
                        <DropdownMenuCheckboxItem key={column.name} checked={field.value.includes(column.name)} onCheckedChange={() => handleColumnToggle(column.name)}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{column.name}</span>
                            <span className="text-xs text-muted-foreground">{column.type}</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Conditions section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base font-medium">CONDITIONS</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={addCondition} disabled={!selectedTable}>
              Add condition
            </Button>
          </div>

          {form.watch('conditions').map((condition, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <Button type="button" variant="ghost" size="sm" onClick={() => removeCondition(index)} className="h-8 w-8 p-0">
                <XIcon className="h-4 w-4" />
              </Button>

              <span className="text-sm font-medium text-muted-foreground">where</span>

              <Select value={condition.column} onValueChange={value => updateCondition(index, 'column', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  {(columns as DatabaseColumn[])?.map(column => (
                    <SelectItem key={column.name} value={column.name}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={condition.operator} onValueChange={value => updateCondition(index, 'operator', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(operator => (
                    <SelectItem key={operator.value} value={operator.value}>
                      {operator.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL' && (
                <Input placeholder="Value" value={condition.value} onChange={e => updateCondition(index, 'value', e.target.value)} className="w-32" />
              )}
            </div>
          ))}
        </div>

        {/* SQL Query Editor */}
        <FormField
          control={form.control}
          name="query"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">SQL Query</FormLabel>
              <FormControl>
                <Textarea placeholder="SELECT * FROM table_name WHERE condition..." className="min-h-[200px] font-mono text-sm bg-muted/50 border-0 focus-visible:ring-1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" className="cursor-pointer" disabled={createViewMutation.isPending}>
            {createViewMutation.isPending ? <Spinner className="size-4" /> : 'Create view'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
