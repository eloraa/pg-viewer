'use client';

import { type Table } from '@tanstack/react-table';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTableFacetedFilter } from './data-filter';
import { FilterItem } from './filter-item';
import { Button } from '@/components/ui/button';
import { XIcon, Blend, type LucideIcon } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import React from 'react';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { DataInput } from './data-table-input';
import { DataTablePagination } from './data-table-pagination';
import { cn } from '@/lib/utils';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterWithItem {
  label: string;
  value: string;
  defaultValue?: string;
  icon?: LucideIcon;
  options: Array<{
    label: string;
    value: string;
  }>;
}

interface CustomFilterProps {
  className?: string;
  label?: string;
  [key: string]: unknown;
}

interface CustomFilterItem {
  filter: React.ComponentType<CustomFilterProps>;
  label: string;
  props?: Record<string, unknown>;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  statuses?: FilterOption[];
  filterWith?: FilterWithItem | FilterWithItem[];
  defaultStatus?: string;
  placeholder?: string;
  id?: string | string[] | { value: string; label: string; input?: React.ReactNode }[];
  dateFilter?: boolean;
  customFilter?: CustomFilterItem[];
  selectActions?: React.ReactNode | React.ReactNode[];
  pageSizes?: number[];
  className?: string;
}

export function DataTableToolbar<TData>({ table, statuses = [], filterWith, defaultStatus, placeholder, id, dateFilter, customFilter, selectActions, pageSizes, className }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const selectedRows = table.getSelectedRowModel().rows.length;

  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Normalize id options
  const idOptions: Array<{ value: string; label: string; input?: React.ReactNode }> = React.useMemo(() => {
    if (Array.isArray(id)) {
      if (typeof id[0] === 'object' && id[0] !== null && 'value' in id[0] && 'label' in id[0]) {
        return id as Array<{ value: string; label: string; input?: React.ReactNode }>;
      } else {
        return (id as string[]).map(v => ({ value: v, label: v }));
      }
    } else if (typeof id === 'string') {
      return [{ value: id, label: id }];
    }
    return [];
  }, [id]);

  const [selectedId, setSelectedId] = React.useState<string>(idOptions[0]?.value || '');

  React.useEffect(() => {
    if (idOptions.length && !idOptions.some(opt => opt.value === selectedId)) {
      setSelectedId(idOptions[0].value);
    }
  }, [idOptions, selectedId]);

  return (
    <div className={cn('space-y-2 px-2', className)}>
      <div className="flex items-end justify-between gap-2 flex-wrap py-1">
        <div className="flex flex-wrap flex-1 items-center gap-2 max-md:space-y-2">
          <div className="flex items-center">
            {idOptions.find(opt => opt.value === selectedId)?.input || (
              <DataInput
                key={idOptions.find(opt => opt.value === selectedId)?.value + '-input'}
                placeholder={placeholder}
                value={(table.getColumn(selectedId || '')?.getFilterValue() as string) ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => table.getColumn(selectedId || '')?.setFilterValue(event.target.value)}
                className={idOptions.length > 1 ? 'rounded-none h-8 max-w-40 shadow-none' : ''}
              />
            )}
            {idOptions.length > 1 && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-[120px] truncate bg-background dark:bg-background border-border dark:border-border rounded-none !h-8 min-h-0 max-w-20 shadow-none">
                  <SelectValue className="truncate">
                    <span className="truncate text-muted-foreground">{idOptions.find(opt => opt.value === selectedId)?.label}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {idOptions.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {isDesktop && (
            <>
              {statuses?.length > 0 && table.getColumn('status') && <DataTableFacetedFilter<TData> defaultValue={defaultStatus} column={table.getColumn('status')} title="Status" options={statuses} />}

              {filterWith && (
                <>
                  {Array.isArray(filterWith)
                    ? filterWith.map(
                        (item, index) =>
                          table.getColumn(item.value) && (
                            <DataTableFacetedFilter<TData>
                              key={index}
                              defaultValue={item.defaultValue}
                              column={table.getColumn(item.value)}
                              title={item.label}
                              icon={item.icon || Blend}
                              options={item.options}
                            />
                          )
                      )
                    : table.getColumn(filterWith.value) && (
                        <DataTableFacetedFilter<TData>
                          defaultValue={filterWith.defaultValue}
                          column={table.getColumn(filterWith.value)}
                          title={filterWith.label}
                          icon={filterWith.icon || Blend}
                          options={filterWith.options}
                        />
                      )}
                </>
              )}

              {isFiltered && (
                <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
                  Reset
                  <XIcon className="ml-2 h-4 w-4" />
                </Button>
              )}

              {dateFilter && <FilterItem className="[&>*]:h-8" iconOnly={false} onChange={() => {}} defaultRange={undefined} overrideLabel="" checkbox={false} />}
              {customFilter &&
                customFilter.length > 0 &&
                customFilter.map((item, index) => <item.filter className="*:border-dashed border-dashed [&>*]:h-9" label={item.label} key={index} {...item.props} />)}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-col md:flex-row">
          {selectedRows > 0 && isDesktop && <>{Array.isArray(selectActions) ? selectActions.map((action, index) => <div key={index}>{action}</div>) : selectActions}</>}

          <DataTablePagination table={table} pageSizes={pageSizes} />
          <DataTableViewOptions table={table} />
        </div>
      </div>
      {!isDesktop && (
        <div className="flex items-center flex-wrap gap-2 py-1">
          {statuses?.length > 0 && table.getColumn('status') && <DataTableFacetedFilter<TData> defaultValue={defaultStatus} column={table.getColumn('status')} title="Status" options={statuses} />}

          {filterWith && (
            <>
              {Array.isArray(filterWith)
                ? filterWith.map(
                    (item, index) =>
                      table.getColumn(item.value) && (
                        <DataTableFacetedFilter<TData>
                          key={index}
                          defaultValue={item.defaultValue}
                          column={table.getColumn(item.value)}
                          title={item.label}
                          icon={item.icon || Blend}
                          options={item.options}
                        />
                      )
                  )
                : table.getColumn(filterWith.value) && (
                    <DataTableFacetedFilter<TData>
                      defaultValue={filterWith.defaultValue}
                      column={table.getColumn(filterWith.value)}
                      title={filterWith.label}
                      icon={filterWith.icon || Blend}
                      options={filterWith.options}
                    />
                  )}
            </>
          )}

          {isFiltered && (
            <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
              Reset
              <XIcon className="ml-2 h-4 w-4" />
            </Button>
          )}

          {dateFilter && <FilterItem className="[&>*]:h-8" iconOnly={false} onChange={() => {}} defaultRange={undefined} overrideLabel="" checkbox={false} />}
          {customFilter &&
            customFilter.length > 0 &&
            customFilter.map((item, index) => <item.filter className="*:border-dashed border-dashed [&>*]:h-8" label={item.label} key={index} {...item.props} />)}

          {selectedRows > 0 && !isDesktop && (
            <div className="flex items-center gap-2 justify-self-end ml-auto flex-wrap">
              <span className="text-sm text-muted-foreground">{selectedRows} selected</span>
              {Array.isArray(selectActions) ? selectActions.map((action, index) => <div key={index}>{action}</div>) : selectActions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
