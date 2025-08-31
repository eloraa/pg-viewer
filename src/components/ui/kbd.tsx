import { cn } from '@/lib/utils';
import * as React from 'react';

const Kbd = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<'kbd'>>(({ className, ...props }, ref) => (
  <kbd className={cn('px-1 py-0.5 border bg-muted text-muted-foreground font-mono text-xs inline-flex items-center gap-1 rounded-sm font-medium', className)} ref={ref} {...props} />
));

Kbd.displayName = 'Kbd';

export { Kbd };
