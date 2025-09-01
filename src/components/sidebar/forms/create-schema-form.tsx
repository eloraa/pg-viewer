'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { createSchema } from '@/lib/server/actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const schemaSchema = z.object({
  schemaName: z
    .string()
    .min(1, { message: 'Schema name is required.' })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { 
      message: 'Schema name must start with a letter or underscore and contain only letters, numbers, and underscores.' 
    }),
});

interface CreateSchemaFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function CreateSchemaForm({ className, onSuccess }: CreateSchemaFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof schemaSchema>>({
    resolver: zodResolver(schemaSchema),
    defaultValues: {
      schemaName: '',
    },
  });

  const createSchemaMutation = useMutation({
    mutationFn: async (schemaName: string) => {
      return createSchema(schemaName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        toast.error(error.message);
        form.setError('schemaName', {
          type: 'server',
          message: (error as { message: string }).message,
        });
      }
    },
  });

  function onSubmit(values: z.infer<typeof schemaSchema>) {
    toast.promise(createSchemaMutation.mutateAsync(values.schemaName), {
      loading: 'Creating schema...',
      success: 'Schema created successfully',
      error: (err: unknown) => {
        if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
          return (err as { message: string }).message;
        }
        return 'Failed to create schema';
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
        <FormField
          control={form.control}
          name="schemaName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Schema Name</FormLabel>
              <div className="relative flex flex-col w-full">
                <FormControl>
                  <Input placeholder="Enter schema name" {...field} />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="submit" className="cursor-pointer" disabled={createSchemaMutation.isPending}>
            {createSchemaMutation.isPending ? <Spinner className="size-4" /> : 'Create Schema'}
          </Button>
        </div>
      </form>
    </Form>
  );
}