'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type DateTimePickerProps = {
  children: React.ReactNode;
  onClose?: (date: Date) => void;
  defaultDate?: Date;
};

export function DateTimePicker({ children, onClose, defaultDate }: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(defaultDate);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', value: string) => {
    if (date) {
      const newDate = new Date(date);
      if (type === 'hour') {
        newDate.setHours((parseInt(value) % 12) + (newDate.getHours() >= 12 ? 12 : 0));
      } else if (type === 'minute') {
        newDate.setMinutes(parseInt(value));
      } else if (type === 'ampm') {
        const currentHours = newDate.getHours();
        newDate.setHours(value === 'PM' ? currentHours + 12 : currentHours - 12);
      }
      setDate(newDate);
    }
  };

  return (
    <Popover
      onOpenChange={e => {
        if (!e && onClose && date) onClose(date);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-none">
        <div className="sm:flex">
          <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {hours.reverse().map(hour => (
                  <Button
                    key={hour}
                    size="icon"
                    variant={date && date.getHours() % 12 === hour % 12 ? 'default' : 'ghost'}
                    className={cn('sm:w-full shrink-0 aspect-square rounded-none', date && date.getHours() % 12 === hour % 12 && 'bg-brand-magenta-primary text-brand-magenta-primary-foreground')}
                    onClick={() => handleTimeChange('hour', hour.toString())}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                  <Button
                    key={minute}
                    size="icon"
                    variant={date && date.getMinutes() === minute ? 'default' : 'ghost'}
                    className={cn('sm:w-full shrink-0 aspect-square rounded-none', date && date.getMinutes() === minute % 12 && 'bg-brand-magenta-primary text-brand-magenta-primary-foreground')}
                    onClick={() => handleTimeChange('minute', minute.toString())}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="">
              <div className="flex sm:flex-col p-2">
                {['AM', 'PM'].map(ampm => (
                  <Button
                    key={ampm}
                    size="icon"
                    variant={date && ((ampm === 'AM' && date.getHours() < 12) || (ampm === 'PM' && date.getHours() >= 12)) ? 'default' : 'ghost'}
                    className={cn(
                      'sm:w-full shrink-0 aspect-square rounded-none',
                      date && ((ampm === 'AM' && date.getHours() < 12) || (ampm === 'PM' && date.getHours() >= 12)) && 'bg-brand-magenta-primary text-brand-magenta-primary-foreground'
                    )}
                    onClick={() => handleTimeChange('ampm', ampm)}
                  >
                    {ampm}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
