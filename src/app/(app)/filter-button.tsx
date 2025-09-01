'use client';

import * as React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterButtonProps {
  className?: string;
  label?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const FilterButton = ({ className, label = 'Filter', isActive = false, onClick }: FilterButtonProps) => {
  return (
    <Button size="sm" variant={isActive ? 'secondary' : 'outline'} onClick={onClick} className={cn('h-8 border', className)}>
      <Filter className="size-4" />
      {label}
    </Button>
  );
};
