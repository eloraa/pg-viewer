'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonacoEditorPopover } from '@/components/data-table/monaco-editor-popover';

interface FilterCondition {
  id: string;
  connector: 'where' | 'and' | 'or';
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null';
  value: string;
}

interface FilterPanelProps {
  columns: Array<{ name: string; type: string }>;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  className?: string;
}

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'is_null', label: 'is null' },
  { value: 'is_not_null', label: 'is not null' },
];

export const FilterPanel = ({ columns, filters, onFiltersChange, onClearFilters, onApplyFilters, className }: FilterPanelProps) => {
  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: `filter_${Date.now()}`,
      connector: filters.length === 0 ? 'where' : 'and',
      column: columns[0]?.name || '',
      operator: 'equals',
      value: '',
    };
    onFiltersChange([...filters, newFilter]);
  };

  const removeFilter = (filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId);
    // If we're removing the first filter, make sure the next one becomes "where"
    if (updatedFilters.length > 0 && filters[0]?.id === filterId) {
      updatedFilters[0] = { ...updatedFilters[0], connector: 'where' };
    }
    onFiltersChange(updatedFilters);
  };

  const updateFilter = (filterId: string, updates: Partial<FilterCondition>) => {
    const updatedFilters = filters.map(f => (f.id === filterId ? { ...f, ...updates } : f));
    onFiltersChange(updatedFilters);
  };

  const needsValueInput = (operator: string) => {
    return !['is_null', 'is_not_null'].includes(operator);
  };

  // Check if any filter has a value to show Apply button
  const hasFiltersWithValues = filters.some(filter => !needsValueInput(filter.operator) || (needsValueInput(filter.operator) && filter.value.trim() !== ''));

  return (
    <div className={cn('bg-muted/30 border-t border-border p-3 space-y-2', className)}>
      {filters.map((filter, index) => (
        <div key={filter.id} className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="icon" onClick={() => removeFilter(filter.id)} className="h-6 w-6">
            <X className="h-3 w-3" />
          </Button>

          <Select value={filter.connector} onValueChange={(value: 'where' | 'and' | 'or') => updateFilter(filter.id, { connector: value })} disabled={index === 0}>
            <SelectTrigger className="h-9 w-25">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="where">where</SelectItem>
              <SelectItem value="and">and</SelectItem>
              <SelectItem value="or">or</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter.column} onValueChange={value => updateFilter(filter.id, { column: value })}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(column => (
                <SelectItem key={column.name} value={column.name}>
                  {column.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter.operator} onValueChange={(value: FilterCondition['operator']) => updateFilter(filter.id, { operator: value })}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map(op => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {needsValueInput(filter.operator) && (
            <div className="relative flex items-center group">
              <MonacoEditorPopover
                value={filter.value}
                defaultValue={filter.value || ''}
                dataType="text"
                nullable={true}
                onSave={newValue => {
                  if (newValue === null) {
                    updateFilter(filter.id, { operator: 'is_null', value: '' });
                  } else {
                    updateFilter(filter.id, { value: String(newValue || '') });
                  }
                }}
                onCancel={() => {}}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-1"
                ancorClass="truncate min-w-0 size-full ring-inset flex items-center group relative h-9 w-60"
              >
                <Input value={filter.value} onChange={e => updateFilter(filter.id, { value: e.target.value })} placeholder="Value" className="h-9 w-60 text-xs bg-background border-border" />
              </MonacoEditorPopover>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        {hasFiltersWithValues && (
          <Button size="sm" onClick={onApplyFilters} className="h-7">
            Apply
          </Button>
        )}

        <Button variant="secondary" size="sm" onClick={addFilter} className="h-7">
          <Plus className="h-3 w-3 mr-1" />
          Add filter
        </Button>

        {filters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-7">
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};
