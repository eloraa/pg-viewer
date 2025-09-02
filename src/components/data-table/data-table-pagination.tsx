import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRightIcon, ChevronLeftIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Spinner } from '../ui/spinner';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizes?: number[];
  isLoading?: boolean;
}

export function DataTablePagination<TData>({ table, isLoading }: DataTablePaginationProps<TData>) {
  const [pageSizeInput, setPageSizeInput] = useState(table.getState().pagination.pageSize.toString());
  const [offsetInput, setOffsetInput] = useState((table.getState().pagination.pageIndex * table.getState().pagination.pageSize).toString());

  // Update local state when table state changes
  useEffect(() => {
    setPageSizeInput(table.getState().pagination.pageSize.toString());
  }, [table.getState().pagination.pageSize]);

  useEffect(() => {
    setOffsetInput((table.getState().pagination.pageIndex * table.getState().pagination.pageSize).toString());
  }, [table.getState().pagination.pageIndex, table.getState().pagination.pageSize]);

  return (
    <TooltipProvider>
      <div className="flex items-center justify-center space-x-2">
        <div className="flex items-center text-xs font-mono font-medium text-muted-foreground">
          {isLoading ? (
            <Spinner className="size-4" />
          ) : (
            <>
              {table.getRowModel().rows.length} of {table.getPageCount() * table.getState().pagination.pageSize} rows |{' '}
              {table.getState().pagination.pageSize * table.getState().pagination.pageIndex + table.getRowModel().rows.length > 0 ? '803ms' : '0ms'}
            </>
          )}
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
                inputMode="numeric"
                value={pageSizeInput}
                placeholder="LIMIT"
                onChange={e => {
                  const value = e.target.value;
                  // Only allow digits and empty string
                  if (value === '' || /^\d*$/.test(value)) {
                    setPageSizeInput(value);
                  }
                }}
                onBlur={e => {
                  const value = e.target.value;
                  // If input is empty, set to default
                  if (value === '') {
                    setPageSizeInput('10');
                    table.setPageSize(10);
                    return;
                  }
                  // Only allow digits
                  const numericValue = value.replace(/\D/g, '');
                  if (numericValue) {
                    const numValue = parseInt(numericValue) || 10;
                    const clampedValue = Math.min(Math.max(numValue, 1), 1000);
                    setPageSizeInput(clampedValue.toString());
                    table.setPageSize(clampedValue);
                  } else {
                    // Reset to current value if invalid
                    setPageSizeInput(table.getState().pagination.pageSize.toString());
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
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
                inputMode="numeric"
                value={offsetInput}
                placeholder="OFFSET"
                onChange={e => {
                  const value = e.target.value;
                  // Only allow digits and empty string
                  if (value === '' || /^\d*$/.test(value)) {
                    setOffsetInput(value);
                  }
                }}
                onBlur={e => {
                  const value = e.target.value;
                  // If input is empty, set to 0
                  if (value === '') {
                    setOffsetInput('0');
                    table.setPageIndex(0);
                    return;
                  }
                  // Only allow digits
                  const numericValue = value.replace(/\D/g, '');
                  if (numericValue) {
                    const offset = parseInt(numericValue) || 0;
                    const pageSize = table.getState().pagination.pageSize;
                    const pageIndex = Math.floor(offset / pageSize);
                    setOffsetInput(offset.toString());
                    table.setPageIndex(pageIndex);
                  } else {
                    // Reset to current value if invalid
                    setOffsetInput((table.getState().pagination.pageIndex * table.getState().pagination.pageSize).toString());
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
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
