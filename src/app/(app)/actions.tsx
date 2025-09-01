'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2Icon } from 'lucide-react';
import { deleteTableRows } from '@/lib/server/actions';
import { toast } from 'sonner';

interface ActionsProps {
  data: Record<string, unknown>[] | null;
  table: Table<Record<string, unknown>>;
  schema: string;
  tableName: string;
}

export const Actions = ({ data, table, schema, tableName }: ActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (rowData: Record<string, unknown>[]) => {
      if (!data || data.length === 0) {
        throw new Error('No rows selected');
      }
      return deleteTableRows(schema, tableName, rowData);
    },
    onSuccess: response => {
      toast.success(response.message);
      // Invalidate table data queries to refetch the data
      queryClient.invalidateQueries({ queryKey: ['tableData', schema, tableName] });
      setShowDeleteDialog(false);
      table.toggleAllRowsSelected(false);
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && typeof error.message === 'string') {
        toast.error(error.message);
      } else {
        toast.error('Failed to delete rows');
      }
    },
  });

  const handleDelete = () => {
    if (!data || data.length === 0) return;

    // Pass the full row data instead of just IDs
    deleteMutation.mutate(data);
  };

  if (!data || data.length === 0) return null;

  return (
    <>
      <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={!data || data.length === 0}>
        <Trash2Icon className="!size-4" />
        Delete ({data?.length || 0})
      </Button>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="md:max-w-md pt-6">
          <DialogHeader>
            <DialogTitle>Delete Rows</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {data?.length || 0} selected row{(data?.length || 0) === 1 ? '' : 's'} from {schema}.{tableName}?
            </DialogDescription>
          </DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground">This action cannot be undone. The selected rows will be permanently deleted from the database.</p>
          </div>
          <DialogFooter className="flex max-md:flex-col max-md:items-end max-md:space-y-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-20 cursor-pointer">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="w-20 cursor-pointer" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
