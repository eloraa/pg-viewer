'use client';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { ThemeSelector } from '../theme/theme-selector';
import { VariantSelector } from '../theme/variant-selector';

export function General({ fullscreen }: { fullscreen?: boolean; isModal?: boolean }) {
  return (
    <div className="space-y-4 max-md:pb-20">
      <h1 className="px-4 h-12 flex items-center">General Settings</h1>

      <div className="space-y-6 md:space-y-4 divide-y text-sm flex-col flex max-md:flex-col-reverse">
        <div className="pb-4 px-4 space-y-4">
          <VariantSelector />
        </div>

        <div className={cn('grid md:grid-cols-2 pb-4 px-4 max-md:gap-2', fullscreen && 'lg:grid-cols-3')}>
          <h1 className="flex items-center">Theme</h1>
          <div className={cn('flex items-center md:justify-end w-full', fullscreen && 'lg:col-span-2')}>
            <ThemeSelector className="border" />
          </div>
        </div>
      </div>
    </div>
  );
}
