import { type Column } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowDownIcon, ArrowUpIcon, EyeOff, ChevronsUpDown, ExternalLink } from 'lucide-react';

interface DataTableColumnHeaderProps<TData> {
  column: Column<TData, unknown>;
  title: string | React.ReactNode;
  className?: string;
  dataType?: string;
}

export function DataTableColumnHeader<TData>({ 
  column, 
  title, 
  className, 
  dataType 
}: DataTableColumnHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return (
      <div className={cn('flex flex-col', className)}>
        <span>{title}</span>
        {dataType && (
          <span className="text-xs text-muted-foreground font-mono">{dataType}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-3 text-left h-8 data-[state=open]:bg-accent/15">
              <span>{title}</span>
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
      {dataType && (
        <span className="text-xs text-muted-foreground font-mono -ml-3 pl-3">{dataType}</span>
      )}
    </div>
  );
}
