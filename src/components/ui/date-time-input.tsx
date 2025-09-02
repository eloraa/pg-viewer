'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time';

interface DateTimeInputProps {
  date?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  hideTime?: boolean;
  autoSave?: boolean; // When false, only save on Enter or blur
}

export function DateTimeInput({ date, onSelect, className, hideTime = false, autoSave = true }: DateTimeInputProps) {
  const [day, setDay] = React.useState<string>(date ? format(date, 'dd') : '');
  const [month, setMonth] = React.useState<string>(date ? format(date, 'MM') : '');
  const [year, setYear] = React.useState<string>(date ? format(date, 'yyyy') : '');
  const [hour, setHour] = React.useState<string>(date ? format(date, 'HH') : '');
  const [minute, setMinute] = React.useState<string>(date ? format(date, 'mm') : '');

  React.useEffect(() => {
    if (date) {
      setDay(format(date, 'dd'));
      setMonth(format(date, 'MM'));
      setYear(format(date, 'yyyy'));
      if (!hideTime) {
        setHour(format(date, 'HH'));
        setMinute(format(date, 'mm'));
      }
    }
  }, [date, hideTime]);

  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const minuteRef = React.useRef<HTMLInputElement>(null);

  // Track focus state for each input
  const [isDayFocused, setIsDayFocused] = React.useState(false);
  const [isMonthFocused, setIsMonthFocused] = React.useState(false);
  const [isYearFocused, setIsYearFocused] = React.useState(false);
  const [isHourFocused, setIsHourFocused] = React.useState(false);
  const [isMinuteFocused, setIsMinuteFocused] = React.useState(false);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      if (onSelect) onSelect(date);
    }
  };

  const handleManualSave = () => {
    if (!autoSave && day && month && year) {
      const hourValue = hideTime ? '00' : hour || '00';
      const minuteValue = hideTime ? '00' : minute || '00';
      
      // Validate and create date directly for manual save
      if (day.length === 2 && month.length === 2 && year.length === 4) {
        // Validate day based on month and year
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const dayNum = parseInt(day);

        if (dayNum > daysInMonth) {
          return; // Invalid day for this month
        }

        // Construct date string in ISO format for consistent parsing
        const dateStr = `${year}-${month}-${day}T${hourValue}:${minuteValue}:00`;
        const newDate = new Date(dateStr);

        // Validate the date is real and matches input
        if (!isNaN(newDate.getTime()) && newDate.getDate() === parseInt(day, 10) && newDate.getMonth() + 1 === parseInt(month, 10) && newDate.getFullYear() === parseInt(year, 10)) {
          if (onSelect) onSelect(newDate);
        }
      }
    }
  };

  const validateAndUpdateDateTime = (newDay: string, newMonth: string, newYear: string, newHour?: string, newMinute?: string) => {
    if (newDay.length === 2 && newMonth.length === 2 && newYear.length === 4) {
      // Validate day based on month and year
      const daysInMonth = new Date(parseInt(newYear), parseInt(newMonth), 0).getDate();
      const dayNum = parseInt(newDay);

      if (dayNum > daysInMonth) {
        return; // Invalid day for this month
      }

      // Use provided time or default to current time
      const hour = newHour || (date ? format(date, 'HH') : '00');
      const minute = newMinute || (date ? format(date, 'mm') : '00');

      // Construct date string in ISO format for consistent parsing
      const dateStr = `${newYear}-${newMonth}-${newDay}T${hour}:${minute}:00`;
      const newDate = new Date(dateStr);

      // Validate the date is real and matches input
      if (!isNaN(newDate.getTime()) && newDate.getDate() === parseInt(newDay, 10) && newDate.getMonth() + 1 === parseInt(newMonth, 10) && newDate.getFullYear() === parseInt(newYear, 10)) {
        // Only trigger onSelect if autoSave is enabled
        if (autoSave && onSelect) {
          onSelect(newDate);
        }
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
          validateAndUpdateDateTime(paddedValue, month, year, hour, minute);
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
        validateAndUpdateDateTime(value, month, year, hour, minute);
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

          validateAndUpdateDateTime(day, paddedValue, year, hour, minute);
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

          validateAndUpdateDateTime(day, paddedValue, year, hour, minute);
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
            validateAndUpdateDateTime(day, month, value, hour, minute);
          }
        } else {
          // If invalid, keep the first three digits
          setYear(value.slice(0, 3));
        }
      }
    }
  };

  const handleHourChange = (value: string) => {
    if (value === '') {
      setHour('');
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    if (value.length <= 2) {
      if (value.length === 1) {
        if (numValue >= 0 && numValue <= 2) {
          setHour(value);
        } else if (numValue > 2) {
          const paddedValue = '0' + value;
          if (parseInt(paddedValue) <= 23) {
            setHour(paddedValue);
            setTimeout(() => {
              minuteRef.current?.focus();
            }, 0);
            validateAndUpdateDateTime(day, month, year, paddedValue, minute);
          }
        }
        return;
      }

      if (value.length === 2) {
        if (numValue >= 0 && numValue <= 23) {
          setHour(value);
          setTimeout(() => {
            minuteRef.current?.focus();
          }, 0);
          validateAndUpdateDateTime(day, month, year, value, minute);
        } else {
          setHour(value[0]);
        }
      }
    }
  };

  const handleMinuteChange = (value: string) => {
    if (value === '') {
      setMinute('');
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    if (value.length <= 2) {
      if (value.length === 1) {
        if (numValue >= 0 && numValue <= 5) {
          setMinute(value);
        } else if (numValue > 5) {
          const paddedValue = '0' + value;
          if (parseInt(paddedValue) <= 59) {
            setMinute(paddedValue);
            validateAndUpdateDateTime(day, month, year, hour, paddedValue);
          }
        }
        return;
      }

      if (value.length === 2) {
        if (numValue >= 0 && numValue <= 59) {
          setMinute(value);
          validateAndUpdateDateTime(day, month, year, hour, value);
        } else {
          setMinute(value[0]);
        }
      }
    }
  };

  type DateFieldType = 'day' | 'month' | 'year' | 'hour' | 'minute';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>, field: DateFieldType) => {
    // Set placeholder text as value when focusing empty field
    if (field === 'day' && !day) setDay('DD');
    if (field === 'month' && !month) setMonth('MM');
    if (field === 'year' && !year) setYear('YYYY');
    if (field === 'hour' && !hour) setHour('HH');
    if (field === 'minute' && !minute) setMinute('MM');

    // Select all text on focus
    setTimeout(() => {
      e.target.select();
      if (field === 'day') setIsDayFocused(true);
      if (field === 'month') setIsMonthFocused(true);
      if (field === 'year') setIsYearFocused(true);
      if (field === 'hour') setIsHourFocused(true);
      if (field === 'minute') setIsMinuteFocused(true);
    }, 0);
  };

  const handleBlur = (field: DateFieldType) => {
    // Clear placeholder text if no real value was entered
    if (field === 'day' && day === 'DD') setDay('');
    if (field === 'month' && month === 'MM') setMonth('');
    if (field === 'year' && year === 'YYYY') setYear('');
    if (field === 'hour' && hour === 'HH') setHour('');
    if (field === 'minute' && minute === 'MM') setMinute('');

    // Remove focus state
    if (field === 'day') setIsDayFocused(false);
    if (field === 'month') setIsMonthFocused(false);
    if (field === 'year') setIsYearFocused(false);
    if (field === 'hour') setIsHourFocused(false);
    if (field === 'minute') setIsMinuteFocused(false);

    if (!autoSave) {
      setTimeout(() => {
        const activeElement = document.activeElement;
        const isStillFocusedWithin =
          activeElement === dayRef.current || activeElement === monthRef.current || activeElement === yearRef.current || activeElement === hourRef.current || activeElement === minuteRef.current;

        if (!isStillFocusedWithin) {
          handleManualSave();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: DateFieldType) => {
    // Handle Enter key for manual save when autoSave is false
    if (e.key === 'Enter' && !autoSave) {
      e.preventDefault();
      handleManualSave();
      return;
    }

    // Handle escape key navigation when field is empty
    if (e.key === 'Escape') {
      e.preventDefault();
      if (field === 'month' && !month) {
        dayRef.current?.focus();
      } else if (field === 'year' && !year) {
        monthRef.current?.focus();
      } else if (field === 'hour' && !hour) {
        yearRef.current?.focus();
      } else if (field === 'minute' && !minute) {
        hourRef.current?.focus();
      }
      return;
    }

    // Handle backspace navigation
    if (
      e.key === 'Backspace' &&
      ((field === 'day' && day === 'DD') ||
        (field === 'month' && month === 'MM') ||
        (field === 'year' && year === 'YYYY') ||
        (field === 'hour' && hour === 'HH') ||
        (field === 'minute' && minute === 'MM'))
    ) {
      e.preventDefault();
      if (field === 'month') {
        dayRef.current?.focus();
      } else if (field === 'year') {
        monthRef.current?.focus();
      } else if (field === 'hour') {
        yearRef.current?.focus();
      } else if (field === 'minute') {
        hourRef.current?.focus();
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
        } else if (field === 'hour') {
          yearRef.current?.focus();
        } else if (field === 'minute') {
          hourRef.current?.focus();
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (field === 'day') {
          monthRef.current?.focus();
        } else if (field === 'month') {
          yearRef.current?.focus();
        } else if (field === 'year' && !hideTime) {
          hourRef.current?.focus();
        } else if (field === 'hour') {
          minuteRef.current?.focus();
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
          } else if (field === 'hour') {
            e.preventDefault();
            yearRef.current?.focus();
          } else if (field === 'minute') {
            e.preventDefault();
            hourRef.current?.focus();
          }
        } else {
          // Handle tab
          if (field === 'day') {
            e.preventDefault();
            monthRef.current?.focus();
          } else if (field === 'month') {
            e.preventDefault();
            yearRef.current?.focus();
          } else if (field === 'year' && !hideTime) {
            e.preventDefault();
            hourRef.current?.focus();
          } else if (field === 'hour') {
            e.preventDefault();
            minuteRef.current?.focus();
          }
        }
        break;

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
        } else if (field === 'hour') {
          const currentHour = hour === 'HH' ? 0 : parseInt(hour);
          let newHour = currentHour + increment;
          if (newHour < 0) newHour = 23;
          if (newHour > 23) newHour = 0;
          handleHourChange(newHour.toString().padStart(2, '0'));
        } else if (field === 'minute') {
          const currentMinute = minute === 'MM' ? 0 : parseInt(minute);
          let newMinute = currentMinute + increment;
          if (newMinute < 0) newMinute = 59;
          if (newMinute > 59) newMinute = 0;
          handleMinuteChange(newMinute.toString().padStart(2, '0'));
        }
        break;
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={cn('flex items-center', className)} onClick={handleClick}>
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
          className={cn('min-w-[2ch] w-[3ch] !border-0 shadow-none text-center py-2 px-0 rounded-r-none', isDayFocused && !day && 'text-primary-foreground bg-primary')}
        />
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
          className={cn('min-w-[2ch] w-[3ch] !border-0 shadow-none text-center py-2 px-0 rounded-none border-x-0', isMonthFocused && !month && 'text-primary-foreground bg-primary')}
        />
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
          className={cn('min-w-[4ch] w-[5ch] border-0 text-center py-2 px-0 rounded-none', isYearFocused && !year && 'text-primary-foreground bg-primary')}
        />
        {!hideTime && (
          <>
            <span className="px-1">@</span>
            <Input
              ref={hourRef}
              type="text"
              value={hour}
              placeholder="HH"
              maxLength={2}
              onFocus={e => handleFocus(e, 'hour')}
              onBlur={() => handleBlur('hour')}
              onMouseUp={handleMouseUp}
              onKeyDown={e => handleKeyDown(e, 'hour')}
              onChange={e => handleHourChange(e.target.value.replace(/\D/g, ''))}
              className={cn('min-w-[2ch] w-[3ch] !border-0 shadow-none text-center py-2 px-0 rounded-none border-x-0', isHourFocused && !hour && 'text-primary-foreground bg-primary')}
            />
            <span className="px-1">:</span>
            <Input
              ref={minuteRef}
              type="text"
              value={minute}
              placeholder="MM"
              maxLength={2}
              onFocus={e => handleFocus(e, 'minute')}
              onBlur={() => handleBlur('minute')}
              onMouseUp={handleMouseUp}
              onKeyDown={e => handleKeyDown(e, 'minute')}
              onChange={e => handleMinuteChange(e.target.value.replace(/\D/g, ''))}
              className={cn('min-w-[2ch] w-[3ch] !border-0 shadow-none text-center py-2 px-0 rounded-l-none', isMinuteFocused && !minute && 'text-primary-foreground bg-primary')}
            />
          </>
        )}
      </div>
      <DateTimePicker onClose={!autoSave ? handleDateChange : undefined} defaultDate={date}>
        <Button variant="ghost" size="icon" className="size-6 rounded-none">
          <span className="sr-only">Select date and time</span>
          <CalendarIcon />
        </Button>
      </DateTimePicker>
    </div>
  );
}
