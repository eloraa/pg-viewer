'use client';

import { type Table, type Column, type HeaderContext } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBreakpoints } from '@/lib/hooks/use-breakpoints';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const breakpoints = useBreakpoints();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="md:ml-auto size-8 flex cursor-pointer bg-background border-border border">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
          </svg>
          <span className="sr-only">View</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={breakpoints === 'md' || breakpoints === 'sm' ? 'center' : 'end'} className="w-[200px]">
        <DropdownMenuLabel className="text-sm font-normal text-foreground/60 pb-2">Toggle columns</DropdownMenuLabel>
        {table
          .getAllColumns()
          .filter((column: Column<TData, unknown>) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column: Column<TData, unknown>) => {
            const header = column.columnDef.header;
            let title = column.id;
            
            // Try to extract title from header function
            if (typeof header === 'function') {
              try {
                const headerElement = header({ column, header: undefined, table: undefined } as unknown as HeaderContext<TData, unknown>);
                // Check if it's a React element with props.title (for DataTableColumnHeader)
                if (headerElement && typeof headerElement === 'object' && 'props' in headerElement) {
                  if (headerElement.props?.title) {
                    title = headerElement.props.title;
                  } else if (headerElement.props?.children) {
                    // For foreign key columns that use <span>{referencedTable}</span>
                    title = headerElement.props.children;
                  }
                }
              } catch (error) {
                // Fallback to column id if extraction fails
                console.warn('Failed to extract title from header:', error);
              }
            } else if (typeof header === 'string') {
              title = header;
            }

            return (
              <DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={value => column.toggleVisibility(!!value)}>
                {title}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
