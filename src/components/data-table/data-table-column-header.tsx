import { type Column } from '@tanstack/react-table';
import { cn, getShortDataType } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowDownIcon, ArrowUpIcon, EyeOff, ChevronsUpDown } from 'lucide-react';

interface DataTableColumnHeaderProps<TData> {
  column: Column<TData, unknown>;
  title: string | React.ReactNode;
  className?: string;
  dataType?: string;
}

export function DataTableColumnHeader<TData>({ column, title, className, dataType }: DataTableColumnHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return (
      <div className={cn('flex flex-col', className)}>
        <span>{title}</span>
        {dataType && <span className="text-xs text-muted-foreground font-mono">{getShortDataType(dataType)}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-3 text-left h-8 data-[state=open]:bg-accent/15">
              <div>
                <span>{title}</span> {dataType && <span className="text-xs text-muted-foreground/70 font-mono -ml-3 pl-3">{getShortDataType(dataType)}</span>}
              </div>
              {column.getIsSorted() === 'desc' ? (
                <ArrowDownIcon className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'asc' ? (
                <ArrowUpIcon className="ml-2 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Asc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Desc
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Hide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
