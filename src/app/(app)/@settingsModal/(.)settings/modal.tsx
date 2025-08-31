'use client';
import { Settings } from '@/components/settings/settings';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsModal() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/settings') {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [pathname]);

  return (
    <Dialog
      defaultOpen
      open={open}
      onOpenChange={e => {
        router.back();
        setOpen(e);
      }}
      modal={false}
    >
      <div
        data-slot="dialog-overlay"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
        onClick={() => {
          router.back();
          setOpen(false);
        }}
      />
      <DialogContent
        className="md:max-w-[1200px] flex h-[90dvh] max-h-[640px] w-[95dvw] md:w-[95dvw] flex-1 flex-col items-start px-0 py-0 p-0 overflow-hidden"
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">Account and Security settings</DialogDescription>
        </DialogHeader>
        <Settings isModal />
      </DialogContent>
    </Dialog>
  );
}
