'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { createTable } from '@/lib/server/actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from 'lucide-react';

const columnSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Column name is required.' })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { 
      message: 'Column name must start with a letter or underscore and contain only letters, numbers, and underscores.' 
    }),
  type: z.string().min(1, { message: 'Column type is required.' }),
  nullable: z.boolean().default(true),
});

const tableSchema = z.object({
  tableName: z
    .string()
    .min(1, { message: 'Table name is required.' })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { 
      message: 'Table name must start with a letter or underscore and contain only letters, numbers, and underscores.' 
    }),
  columns: z.array(columnSchema).min(1, { message: 'At least one column is required.' }),
});

const commonPostgresTypes = [
  'TEXT',
  'VARCHAR(255)',
  'INTEGER',
  'BIGINT',
  'DECIMAL',
  'BOOLEAN',
  'DATE',
  'TIMESTAMP',
  'TIMESTAMPTZ',
  'UUID',
  'JSONB',
];

interface CreateTableFormProps {
  schemaName: string;
  className?: string;
  onSuccess?: () => void;
}

export function CreateTableForm({ schemaName, className, onSuccess }: CreateTableFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof tableSchema>>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableName: '',
      columns: [{ name: 'id', type: 'SERIAL PRIMARY KEY', nullable: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'columns',
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: { tableName: string; columns: Array<{name: string, type: string, nullable: boolean}> }) => {
      return createTable(schemaName, data.tableName, data.columns);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', schemaName] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && typeof error.message === 'string') {
        toast.error(error.message);
        form.setError('tableName', {
          type: 'server',
          message: error.message,
        });
      }
    },
  });

  function onSubmit(values: z.infer<typeof tableSchema>) {
    toast.promise(createTableMutation.mutateAsync(values), {
      loading: 'Creating table...',
      success: 'Table created successfully',
      error: (err: unknown) => {
        if (err && typeof err === 'object' && typeof err.message === 'string') {
          return err.message;
        }
        return 'Failed to create table';
      },
    });
  }

  const addColumn = () => {
    append({ name: '', type: 'TEXT', nullable: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
        <FormField
          control={form.control}
          name="tableName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Table Name</FormLabel>
              <div className="relative flex flex-col w-full">
                <FormControl>
                  <Input placeholder="Enter table name" {...field} />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Columns</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={addColumn}>
              <PlusIcon className="size-4" />
              Add Column
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md">
              <FormField
                control={form.control}
                name={`columns.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Column Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Column name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`columns.${index}.type`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Column Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {commonPostgresTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`columns.${index}.nullable`}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">Nullable</FormLabel>
                  </FormItem>
                )}
              />

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="submit" className="cursor-pointer" disabled={createTableMutation.isPending}>
            {createTableMutation.isPending ? <Spinner className="size-4" /> : 'Create Table'}
          </Button>
        </div>
      </form>
    </Form>
  );
}