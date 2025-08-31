'use client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BatteryChargingIcon, PanelLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { getPanelElement, type ImperativePanelHandle } from 'react-resizable-panels';
import * as React from 'react';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { Logo } from '../ui/logo';
import { Dropdown } from './dropdown';

interface HeaderProps {
  panel: ImperativePanelHandle | null;
  sidebarWidth: number;
  isCollapsed: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header = ({ panel, sidebarWidth, isCollapsed, setNavOpen }: HeaderProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const collapseSidebar = () => {
    if (panel) panel.collapse();
  };
  const expandSidebar = () => {
    const panelElement = getPanelElement('sidebar') as HTMLElement;
    if (panel) panel.expand();
    if (panelElement.offsetWidth <= 0) {
      if (panel) panel.resize(25);
    }
  };
  return (
    <div
      className={cn(
        'fixed top-0 inset-x-0 pointer-events-none flex items-center justify-between px-4 h-12 z-40 border-b border-transparent max-md:bg-background',
        isCollapsed && 'bg-background border-border'
      )}
    >
      <div className="flex items-center justify-between pointer-events-auto pr-2 gap-4" style={{ width: isDesktop && !isCollapsed ? sidebarWidth - 16 : 'auto' }}>
        <Link href="/" className="flex items-center gap-1 min-w-0 truncate">
          <Logo className="size-6 min-w-6" />
          <span className="truncate min-w-0">Postgres</span>
          <sup className="text-tertiary">DB</sup>
        </Link>
        {panel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 bg-transparent cursor-e-resize hover:bg-muted-hover shadow-none"
                onClick={() => {
                  if (isDesktop) {
                    if (isCollapsed) expandSidebar();
                    else collapseSidebar();
                  } else {
                    setNavOpen(true);
                  }
                }}
              >
                <PanelLeftIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isCollapsed ? 'Expand' : 'Collapse'}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="pointer-events-auto">
        <Dropdown />
      </div>
    </div>
  );
};
