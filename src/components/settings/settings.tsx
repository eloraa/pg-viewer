'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { General } from './general';

interface SettingsProps {
  className?: string;
  isModal?: boolean;
}

export const Settings = ({ className, isModal = false }: SettingsProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  return (
    <Tabs value="general" className={cn('w-full h-full flex-row gap-0', !isModal && 'max-md:border-t', className)} orientation="vertical">
      <div className={cn('space-y-4 border-r', isModal && 'border-r-input')}>
        <div className={cn('border-b px-4 h-12 flex items-center', isModal && 'border-b-input')}>
          <h1 className="text-sm">Settings</h1>
        </div>
        <div className="px-4">
          <TabsList className="p-0 bg-transparent flex-col items-start md:w-3xs space-y-2 h-auto -mx-2">
            <TabsTrigger
              value="general"
              className="w-full justify-start hover:bg-accent py-2 h-auto data-[state=active]:bg-muted border-0 data-[state=active]:shadow-none min-w-30 max-md:max-w-40 truncate"
              asChild
            >
              <Link
                href={{ href: '/settings/general', query: { setting: 'general' } }}
                onClick={e => {
                  e.preventDefault();
                  const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
                  params.set('setting', 'general');
                  router.replace(`?${params.toString()}`);
                }}
              >
                <SettingsIcon /> General
              </Link>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
      <TabsContent value="general" className="overflow-y-auto md:relative">
        <General fullscreen isModal={isModal} />
      </TabsContent>
    </Tabs>
  );
};
