import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

export const DataInput = ({ className, ...props }: React.ComponentProps<'input'>) => (
  <Input className={cn('caret-brand-saffron-primary bg-background dark:bg-background border-border dark:border-border max-md:w-full w-[150px] lg:w-[250px] h-9', className)} {...props} />
);
