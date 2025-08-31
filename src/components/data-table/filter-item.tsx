'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, CalendarDaysIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';

interface FilterOption {
  label: string;
  value: string;
}

export interface FilterItemProps {
  iconOnly?: boolean;
  onChange?: (value: DateRange | string | undefined) => void;
  className?: string;
  defaultRange?: DateRange;
  label?: string;
  overrideLabel?: string;
  checkbox?: boolean;
}

const filter: FilterOption[] = [
  {
    label: 'Today',
    value: 'today',
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
  },
  {
    label: 'Last 7 Days',
    value: 'last7Days',
  },
  {
    label: 'This Month',
    value: 'thisMonth',
  },
  {
    label: 'Lifetime',
    value: 'lifetime',
  },
  {
    label: 'Custom',
    value: 'custom',
  },
];

export const FilterItem = ({ iconOnly = false, onChange, className, defaultRange, label = 'Filter', overrideLabel, checkbox = false }: FilterItemProps) => {
  const [value, setValue] = React.useState<string | undefined>(checkbox ? undefined : filter[0].value);
  const [date, setDate] = React.useState<DateRange | undefined>(defaultRange);

  const handleChange = (newValue: string | DateRange | undefined) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return iconOnly ? (
    <div className={cn(className)}>
      <Popover>
        <PopoverTrigger className="w-full" asChild>
          <Button variant="outline" className={cn('min-w-6', filter[5].value === value && 'bg-primary/10 dark:bg-muted text-primary')}>
            <CalendarDaysIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={e => {
              setValue(filter[5].value);
              setDate(e);
              handleChange(e);
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn('min-w-6', filter.slice(0, 5).some(item => item.value === value) && 'bg-primary/5 border-primary dark:bg-muted text-primary')}>
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filter.slice(0, checkbox ? 6 : 5).map(item => (
            <DropdownMenuCheckboxItem
              checked={item.value === value}
              key={item.value}
              onSelect={() => {
                const newValue = checkbox ? (item.value === value ? undefined : item.value) : item.value;
                setValue(newValue);
                handleChange(newValue);
              }}
            >
              {item.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <div className={cn(className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn(filter.slice(0, 5).some(item => item.value === value) && 'bg-primary/5 border-primary dark:bg-muted text-primary')}>
            {overrideLabel ? label : filter.find(item => item.value === value)?.label}
            <ChevronDownIcon className="h-5 w-5 min-w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filter.slice(0, checkbox ? 6 : 5).map(item => (
            <DropdownMenuCheckboxItem
              checked={item.value === value}
              key={item.value}
              onSelect={() => {
                const newValue = checkbox ? (item.value === value ? undefined : item.value) : item.value;
                setValue(newValue);
                handleChange(newValue);
              }}
            >
              {item.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover>
        <PopoverTrigger className="w-full" asChild>
          <Button variant="outline" size="sm" className={cn('min-w-6', filter[5].value === value && 'bg-primary/5 border-primary dark:bg-muted text-primary')}>
            <CalendarDaysIcon className="h-[18px] w-[18px]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={e => {
              setValue(filter[5].value);
              setDate(e);
              handleChange(e);
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
