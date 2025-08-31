import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRightIcon, ChevronLeftIcon } from 'lucide-react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizes?: number[];
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-center space-x-2">
        <div className="flex items-center text-xs font-mono font-medium text-muted-foreground">
          {table.getRowModel().rows.length} rows | {table.getState().pagination.pageSize * table.getState().pagination.pageIndex + table.getRowModel().rows.length > 0 ? '803ms' : '0ms'}
        </div>
        <div className="flex items-center">
          <Button variant="outline" className="h-8 w-8 p-0 rounded-r-none" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="text"
                value={table.getState().pagination.pageSize}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value) {
                    const numValue = parseInt(value) || 10;
                    table.setPageSize(Math.min(Math.max(numValue, 1), 1000));
                  }
                }}
                className="w-12 h-8 text-center border-border bg-background text-sm font-medium rounded-none border-x-0 font-mono"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs font-medium font-mono">LIMIT</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Input
                type="text"
                value={table.getState().pagination.pageIndex * table.getState().pagination.pageSize}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value) {
                    const offset = parseInt(value) || 0;
                    const pageSize = table.getState().pagination.pageSize;
                    const pageIndex = Math.floor(offset / pageSize);
                    table.setPageIndex(pageIndex);
                  }
                }}
                className="w-12 h-8 text-center border-border bg-background text-sm font-medium rounded-none border-x-0 font-mono"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs font-medium font-mono">OFFSET</p>
            </TooltipContent>
          </Tooltip>

          <Button variant="outline" className="h-8 w-8 p-0 rounded-l-none" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
