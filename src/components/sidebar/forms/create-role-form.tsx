'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { createRole } from '@/lib/server/actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const roleSchema = z.object({
  roleName: z
    .string()
    .min(1, { message: 'Role name is required.' })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { 
      message: 'Role name must start with a letter or underscore and contain only letters, numbers, and underscores.' 
    }),
  login: z.boolean().default(false),
  password: z.string().optional(),
  superuser: z.boolean().default(false),
});

interface CreateRoleFormProps {
  className?: string;
  onSuccess?: () => void;
}

export function CreateRoleForm({ className, onSuccess }: CreateRoleFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      roleName: '',
      login: false,
      password: '',
      superuser: false,
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: { roleName: string; login: boolean; password?: string; superuser: boolean }) => {
      const options = {
        login: data.login,
        superuser: data.superuser,
        ...(data.password && { password: data.password }),
      };
      return createRole(data.roleName, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      if (error && typeof error === 'object' && typeof error.message === 'string') {
        toast.error(error.message);
        form.setError('roleName', {
          type: 'server',
          message: error.message,
        });
      }
    },
  });

  function onSubmit(values: z.infer<typeof roleSchema>) {
    toast.promise(createRoleMutation.mutateAsync(values), {
      loading: 'Creating role...',
      success: 'Role created successfully',
      error: (err: any) => {
        if (err && typeof err === 'object' && typeof err.message === 'string') {
          return err.message;
        }
        return 'Failed to create role';
      },
    });
  }

  const watchLogin = form.watch('login');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
        <FormField
          control={form.control}
          name="roleName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Name</FormLabel>
              <div className="relative flex flex-col w-full">
                <FormControl>
                  <Input placeholder="Enter role name" {...field} />
                </FormControl>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="login"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Login
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Allow this role to log in to the database
                  </p>
                </div>
              </FormItem>
            )}
          />

          {watchLogin && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative flex flex-col w-full">
                    <FormControl>
                      <Input type="password" placeholder="Enter password (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="superuser"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Superuser
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Grant all privileges to this role
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="submit" className="cursor-pointer" disabled={createRoleMutation.isPending}>
            {createRoleMutation.isPending ? <Spinner className="size-4" /> : 'Create Role'}
          </Button>
        </div>
      </form>
    </Form>
  );
}