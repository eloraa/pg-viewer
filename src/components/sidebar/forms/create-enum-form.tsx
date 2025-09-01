'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { createEnum } from '@/lib/server/actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from 'lucide-react';

const enumSchema = z.object({
  enumName: z
    .string()
    .min(1, { message: 'Enum name is required.' })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { 
      message: 'Enum name must start with a letter or underscore and contain only letters, numbers, and underscores.' 
    }),
  values: z.array(z.object({
    value: z.string().min(1, { message: 'Enum value is required.' })
  })).min(1, { message: 'At least one enum value is required.' }),
});

interface CreateEnumFormProps {
  schemaName: string;
  className?: string;
  onSuccess?: () => void;
}

export function CreateEnumForm({ schemaName, className, onSuccess }: CreateEnumFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof enumSchema>>({
    resolver: zodResolver(enumSchema),
    defaultValues: {
      enumName: '',
      values: [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'values',
  });

  const createEnumMutation = useMutation({
    mutationFn: async (data: { enumName: string; values: string[] }) => {
      return createEnum(schemaName, data.enumName, data.values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', schemaName] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && typeof error.message === 'string') {
        toast.error(error.message);
        form.setError('enumName', {
          type: 'server',
          message: error.message,
        });
      }
    },
  });

  function onSubmit(values: z.infer<typeof enumSchema>) {
    const enumValues = values.values.map(v => v.value);
    toast.promise(createEnumMutation.mutateAsync({ enumName: values.enumName, values: enumValues }), {
      loading: 'Creating enum...',
      success: 'Enum created successfully',
      error: (err: unknown) => {
        if (err && typeof err === 'object' && typeof err.message === 'string') {
          return err.message;
        }
        return 'Failed to create enum';
      },
    });
  }

  const addValue = () => {
    append({ value: '' });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
        <FormField
          control={form.control}
          name="enumName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enum Name</FormLabel>
              <div className="relative flex flex-col w-full">
                <FormControl>
                  <Input placeholder="Enter enum name" {...field} />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Enum Values</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={addValue}>
              <PlusIcon className="size-4" />
              Add Value
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <FormField
                control={form.control}
                name={`values.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Enter enum value" {...field} />
                    </FormControl>
                    <FormMessage />
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
          <Button type="submit" className="cursor-pointer" disabled={createEnumMutation.isPending}>
            {createEnumMutation.isPending ? <Spinner className="size-4" /> : 'Create Enum'}
          </Button>
        </div>
      </form>
    </Form>
  );
}