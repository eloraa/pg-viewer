'use client';

import * as React from 'react';
import { format, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DateInputProps {
  date?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
}

export function DateInput({ date, onSelect, className }: DateInputProps) {
  const [day, setDay] = React.useState<string>(date ? format(date, 'dd') : '');
  const [month, setMonth] = React.useState<string>(date ? format(date, 'MM') : '');
  const [year, setYear] = React.useState<string>(date ? format(date, 'yyyy') : '');
  React.useEffect(() => {
    if (date) {
      setDay(format(date, 'dd'));
      setMonth(format(date, 'MM'));
      setYear(format(date, 'yyyy'));
    }
  }, [date]);

  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);

  // Track focus state for each input
  const [isDayFocused, setIsDayFocused] = React.useState(false);
  const [isMonthFocused, setIsMonthFocused] = React.useState(false);
  const [isYearFocused, setIsYearFocused] = React.useState(false);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const normalizedDate = startOfDay(date);
      if (onSelect) onSelect(normalizedDate);
    }
  };

  const validateAndUpdateDate = (newDay: string, newMonth: string, newYear: string) => {
    if (newDay.length === 2 && newMonth.length === 2 && newYear.length === 4) {
      // Validate day based on month and year
      const daysInMonth = new Date(parseInt(newYear), parseInt(newMonth), 0).getDate();
      const dayNum = parseInt(newDay);

      if (dayNum > daysInMonth) {
        return; // Invalid day for this month
      }

      // Construct date string in ISO format for consistent parsing
      const dateStr = `${newYear}-${newMonth}-${newDay}T00:00:00`;
      const newDate = new Date(dateStr);

      // Validate the date is real and matches input
      if (!isNaN(newDate.getTime()) && newDate.getDate() === parseInt(newDay, 10) && newDate.getMonth() + 1 === parseInt(newMonth, 10) && newDate.getFullYear() === parseInt(newYear, 10)) {
        if (onSelect) onSelect(startOfDay(newDate));
      }
    }
  };

  const handleDayChange = (value: string) => {
    if (value === '') {
      setDay('');
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    // For the first digit
    if (value.length === 1) {
      if (numValue >= 0 && numValue <= 3) {
        setDay(value);
      } else if (numValue > 3) {
        // If user enters a number > 3, pad it to become a valid day
        const paddedValue = '0' + value;
        if (parseInt(paddedValue) <= 31) {
          setDay(paddedValue);
          setTimeout(() => {
            monthRef.current?.focus();
          }, 0);
          validateAndUpdateDate(paddedValue, month, year);
        }
      }
      return;
    }

    // For the second digit
    if (value.length === 2) {
      // If month and year aren't set, just validate against 31
      const maxDays = month && year ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31;

      if (numValue > 0 && numValue <= maxDays) {
        setDay(value);
        setTimeout(() => {
          monthRef.current?.focus();
        }, 0);
        validateAndUpdateDate(value, month, year);
      } else if (numValue > 0 && numValue <= 31) {
        // If it's valid as a standalone day, accept it
        setDay(value);
        setTimeout(() => {
          monthRef.current?.focus();
        }, 0);
      } else {
        setDay(value[0]);
      }
    }
  };

  const handleMonthChange = (value: string) => {
    if (value === '') {
      setMonth('MM');
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    // Allow typing any number initially
    if (value.length <= 2 && numValue >= 0) {
      // For single digit
      if (value.length === 1 && numValue >= 0 && numValue <= 9) {
        // If user types 2-9, auto-prepend 0 and move to next field
        if (numValue >= 2 && numValue <= 9) {
          const paddedValue = `0${value}`;
          setMonth(paddedValue);

          setTimeout(() => {
            yearRef.current?.focus();
          }, 0);

          // Validate day if already entered
          if (day !== 'DD' && year !== 'YYYY') {
            const maxDays = new Date(parseInt(year), numValue, 0).getDate();
            if (parseInt(day) > maxDays) {
              setDay('DD');
            }
          }

          validateAndUpdateDate(day, paddedValue, year);
        } else {
          // For 0 and 1, just set the value and wait for next digit
          setMonth(value);
        }
        return;
      }

      // For two digits
      if (value.length === 2) {
        if (numValue > 0 && numValue <= 12) {
          const paddedValue = value.padStart(2, '0');
          setMonth(paddedValue);
          yearRef.current?.focus();

          // Validate day if already entered
          if (day !== 'DD' && year !== 'YYYY') {
            const maxDays = new Date(parseInt(year), numValue, 0).getDate();
            if (parseInt(day) > maxDays) {
              setDay('DD');
            }
          }

          validateAndUpdateDate(day, paddedValue, year);
        } else {
          // If invalid, keep the first digit if it's valid
          const firstDigit = value[0];
          if (parseInt(firstDigit) > 0 && parseInt(firstDigit) <= 1) {
            setMonth(firstDigit);
          }
        }
      }
    }
  };

  const handleYearChange = (value: string) => {
    if (value === '') {
      setYear('');
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    // Allow typing any number for years
    if (value.length <= 4) {
      // For incomplete years (1-3 digits), just show what's typed
      if (value.length < 4) {
        setYear(value);
        return;
      }

      // For complete years (4 digits)
      if (value.length === 4) {
        const currentYear = new Date().getFullYear();
        // Allow years between 1900 and current year + 100
        if (numValue >= 1900 && numValue <= currentYear + 100) {
          setYear(value);

          // Validate day/month if already entered
          if (day !== 'DD' && month !== 'MM') {
            const maxDays = new Date(numValue, parseInt(month) - 1, 0).getDate();
            if (parseInt(day) > maxDays) {
              setDay('DD');
            }
            validateAndUpdateDate(day, month, value);
          }
        } else {
          // If invalid, keep the first three digits
          setYear(value.slice(0, 3));
        }
      }
    }
  };

  type DateFieldType = 'day' | 'month' | 'year';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>, field: DateFieldType) => {
    // Set placeholder text as value when focusing empty field
    if (field === 'day' && !day) setDay('DD');
    if (field === 'month' && !month) setMonth('MM');
    if (field === 'year' && !year) setYear('YYYY');

    // Select all text on focus
    setTimeout(() => {
      e.target.select();
      if (field === 'day') setIsDayFocused(true);
      if (field === 'month') setIsMonthFocused(true);
      if (field === 'year') setIsYearFocused(true);
    }, 0);
  };

  const handleBlur = (field: DateFieldType) => {
    // Clear placeholder text if no real value was entered
    if (field === 'day' && day === 'DD') setDay('');
    if (field === 'month' && month === 'MM') setMonth('');
    if (field === 'year' && year === 'YYYY') setYear('');

    // Remove focus state
    if (field === 'day') setIsDayFocused(false);
    if (field === 'month') setIsMonthFocused(false);
    if (field === 'year') setIsYearFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: DateFieldType) => {
    // Handle escape key navigation when field is empty
    if (e.key === 'Escape') {
      e.preventDefault();
      if (field === 'month' && !month) {
        dayRef.current?.focus();
      } else if (field === 'year' && !year) {
        monthRef.current?.focus();
      }
      return;
    }

    // Handle backspace navigation
    if (e.key === 'Backspace' && ((field === 'day' && day === 'DD') || (field === 'month' && month === 'MM') || (field === 'year' && year === 'YYYY'))) {
      e.preventDefault();
      if (field === 'month') {
        dayRef.current?.focus();
      } else if (field === 'year') {
        monthRef.current?.focus();
      }
      return;
    }

    // Handle arrow key navigation
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (field === 'month') {
          dayRef.current?.focus();
        } else if (field === 'year') {
          monthRef.current?.focus();
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (field === 'day') {
          monthRef.current?.focus();
        } else if (field === 'month') {
          yearRef.current?.focus();
        }
        break;

      case 'Tab':
        if (e.shiftKey) {
          // Handle shift+tab
          if (field === 'month') {
            e.preventDefault();
            dayRef.current?.focus();
          } else if (field === 'year') {
            e.preventDefault();
            monthRef.current?.focus();
          }
        } else {
          // Handle tab
          if (field === 'day') {
            e.preventDefault();
            monthRef.current?.focus();
          } else if (field === 'month') {
            e.preventDefault();
            yearRef.current?.focus();
          }
        }
        break;

      // Optional: Up/Down arrows to increment/decrement values
      case 'ArrowUp':
      case 'ArrowDown': {
        e.preventDefault();
        const increment = e.key === 'ArrowUp' ? 1 : -1;

        if (field === 'day') {
          const currentDay = day === 'DD' ? 1 : parseInt(day);
          let newDay = currentDay + increment;
          if (newDay < 1) newDay = 31;
          if (newDay > 31) newDay = 1;
          handleDayChange(newDay.toString());
        } else if (field === 'month') {
          const currentMonth = month === 'MM' ? 1 : parseInt(month);
          let newMonth = currentMonth + increment;
          if (newMonth < 1) newMonth = 12;
          if (newMonth > 12) newMonth = 1;
          handleMonthChange(newMonth.toString());
        } else if (field === 'year') {
          const currentYear = year === 'YYYY' ? new Date().getFullYear() : parseInt(year);
          const newYear = currentYear + increment;
          handleYearChange(newYear.toString());
        }
        break;
      }
    }
  };

  // Add mouseUp handler to prevent deselection
  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  return (
    <div className={cn('flex items-start', className)}>
      <div className="flex items-center">
        <Input
          ref={dayRef}
          type="text"
          value={day}
          placeholder="DD"
          maxLength={2}
          onFocus={e => handleFocus(e, 'day')}
          onBlur={() => handleBlur('day')}
          onMouseUp={handleMouseUp}
          onKeyDown={e => handleKeyDown(e, 'day')}
          onChange={e => handleDayChange(e.target.value.replace(/\D/g, ''))}
          className={cn('min-w-[3rem] w-full text-center p-2 rounded-r-none', isDayFocused && !day && 'text-primary-foreground bg-primary')}
        />
        <span className="px-1">/</span>
        <Input
          ref={monthRef}
          type="text"
          value={month}
          placeholder="MM"
          maxLength={2}
          onFocus={e => handleFocus(e, 'month')}
          onBlur={() => handleBlur('month')}
          onMouseUp={handleMouseUp}
          onKeyDown={e => handleKeyDown(e, 'month')}
          onChange={e => handleMonthChange(e.target.value.replace(/\D/g, ''))}
          className={cn('min-w-[3rem] w-full text-center p-2 rounded-none border-x-0', isMonthFocused && !month && 'text-primary-foreground bg-primary')}
        />
        <span className="px-1">/</span>
        <Input
          ref={yearRef}
          type="text"
          value={year}
          placeholder="YYYY"
          maxLength={4}
          onFocus={e => handleFocus(e, 'year')}
          onBlur={() => handleBlur('year')}
          onMouseUp={handleMouseUp}
          onKeyDown={e => handleKeyDown(e, 'year')}
          onChange={e => handleYearChange(e.target.value.replace(/\D/g, ''))}
          className={cn('min-w-[4.5rem] w-full text-center p-2 rounded-none', isYearFocused && !year && 'text-primary-foreground bg-primary')}
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="size-9 min-w-8 rounded-l-none">
            <CalendarIcon className="w-4 h-4" />
            <span className="sr-only">{date ? format(date, 'PPP') : 'Pick a date'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto">
          <Calendar mode="single" selected={date} onSelect={handleDateChange} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );
}
