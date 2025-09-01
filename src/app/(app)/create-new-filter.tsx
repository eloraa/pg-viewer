'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomFilterProps {
  className?: string;
}

interface CreateNewFilterProps extends CustomFilterProps {
  onCreateNew?: () => void;
  disabled?: boolean;
}

export const CreateNewFilter = ({ onCreateNew, disabled = false, className }: CreateNewFilterProps) => {
  return (
    <Button size="sm" variant="secondary" onClick={onCreateNew} disabled={disabled || !onCreateNew} className={cn('h-8 border', className)}>
      <Plus className="size-4" />
      Create New
    </Button>
  );
};
