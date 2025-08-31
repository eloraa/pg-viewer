import * as React from 'react';
import { type Column } from '@tanstack/react-table';
import { Blend, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useBreakpoints } from '@/lib/hooks/use-breakpoints';

interface DataTableFacetedFilterOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

interface DataTableFacetedFilterProps<TData> {
  column?: Column<TData, unknown>;
  title: string;
  defaultValue?: string;
  icon?: LucideIcon;
  options: DataTableFacetedFilterOption[];
  className?: string;
}

export function DataTableFacetedFilter<TData>({ column, title, defaultValue, options, className, icon: Icon = Blend }: DataTableFacetedFilterProps<TData>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  const breakpoints = useBreakpoints();

  const getCounts = React.useCallback(
    (option: DataTableFacetedFilterOption) => {
      if (!facets) return 0;

      let count = 0;
      for (const [key, value] of facets.entries()) {
        if (Array.isArray(key)) {
          count += key.includes(option.value) ? value : 0;
        } else {
          count += key === option.value ? value : 0;
        }
      }
      return count;
    },
    [facets]
  );

  React.useEffect(() => {
    const filterValue = column?.getFilterValue() as string[] | undefined;
    if (defaultValue && !filterValue?.includes(defaultValue)) {
      const selectedValue = new Set(filterValue || []);
      selectedValue.add(defaultValue);
      column?.setFilterValue([defaultValue]);
    }
  }, [column, defaultValue]);

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className="border-dashed capitalize bg-accent/15 rounded-full h-9">
            <Icon className="mr-2 h-4 w-4" />
            {title}
            {selectedValues?.size > 0 && (
              <div className="flex items-center">
                <Separator orientation="vertical" className="mx-2 h-4" />
                <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden w-auto">
                  {selectedValues.size}
                </Badge>
                <div className="hidden space-x-1 lg:flex">
                  {selectedValues.size > 2 ? (
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                      {selectedValues.size} selected
                    </Badge>
                  ) : (
                    options
                      .filter(option => selectedValues.has(option.value))
                      .map(option => (
                        <Badge variant="secondary" key={option.value} className="rounded-sm px-1 font-normal">
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align={breakpoints === 'md' || breakpoints === 'sm' ? 'center' : 'start'}>
          <Command>
            <CommandInput placeholder={title} />
            <CommandList>
              <CommandEmpty>
                <div className="flex items-center justify-center flex-col gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-eye-closed text-foreground"
                  >
                    <path d="m15 18-.722-3.25" />
                    <path d="M2 8a10.645 10.645 0 0 0 20 0" />
                    <path d="m20 15-1.726-2.05" />
                    <path d="m4 15 1.726-2.05" />
                    <path d="m9 18 .722-3.25" />
                  </svg>
                  No results found.
                </div>
              </CommandEmpty>
              <CommandGroup>
                {options.map(option => {
                  const isSelected = selectedValues.has(option.value);
                  const count = getCounts(option);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        if (isSelected) {
                          selectedValues.delete(option.value);
                        } else {
                          selectedValues.add(option.value);
                        }
                        const filterValues = Array.from(selectedValues);
                        column?.setFilterValue(filterValues.length ? filterValues : undefined);
                      }}
                      className="py-2.5 gap-2"
                    >
                      {option.icon && <option.icon className="size-5" />}
                      <span>{option.label}</span>
                      {count > 0 && <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">{count}</span>}
                      <div className={cn('ml-2 flex h-4 w-4 items-center justify-center rounded-sm border border-accent', isSelected ? 'bg-accent text-background' : 'opacity-50 [&_svg]:invisible')}>
                        <CheckIcon className={cn('h-4 w-4')} />
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {selectedValues.size > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={() => column?.setFilterValue(undefined)} className="justify-center text-center">
                      Clear filters
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
