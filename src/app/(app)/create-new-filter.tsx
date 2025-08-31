'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CustomFilterProps {
  className?: string;
}

interface CreateNewFilterProps extends CustomFilterProps {
  onCreateNew?: () => void;
  disabled?: boolean;
}

export const CreateNewFilter = ({ onCreateNew, disabled = false, className }: CreateNewFilterProps) => {
  return (
    <Button
      size="sm"
      onClick={onCreateNew}
      disabled={disabled || !onCreateNew}
      className={className}
    >
      <Plus className="size-4" />
      Create New
    </Button>
  );
};