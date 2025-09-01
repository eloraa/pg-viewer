'use client';

import * as React from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { type CustomFilterProps } from '@/components/data-table/data-table';

export interface RefreshButtonProps extends CustomFilterProps {
  onClick?: () => void;
  isLoading?: boolean;
}

export const RefreshButton = ({ onClick, isLoading = false, ...props }: RefreshButtonProps) => {
  return (
    <div {...props}>
      <Button variant="outline" size="icon" onClick={onClick} disabled={isLoading || !onClick} className="size-8 bg-background border-border dark:bg-background">
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Spinner />
            <span className="sr-only">Refreshing...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <RefreshCwIcon className="h-4 w-4" />
            <span className="sr-only">Refresh</span>
          </div>
        )}
      </Button>
    </div>
  );
};
