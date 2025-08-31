'use client';
import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { getPanelElement, getResizeHandleElement, type ImperativePanelHandle } from 'react-resizable-panels';
import { Header } from './header';
import { DatabaseBrowser } from './database-browser';
import { useSidebarStore } from '@/store/sidebar';

type SidebarProps = {
  defaultLayout: number[];
  children: React.ReactNode;
  defaultCollapsed: boolean;
};

export const Sidebar = ({ defaultLayout = [25, 75], defaultCollapsed = false, children }: SidebarProps) => {
  const navCollapsedSize = 0;
  const { isExpanded, expandSidebar, collapseSidebar } = useSidebarStore();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [panel, setPanel] = React.useState<ImperativePanelHandle | null>(null);
  const [navOpen, setNavOpen] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(0);
  const [increasing, setIncreasing] = React.useState(false);
  const panelRef = React.useRef<ImperativePanelHandle | null>(null);
  const sizeRef = React.useRef(defaultLayout[0]);

  React.useEffect(() => {
    if (panelRef.current) {
      setPanel(panelRef.current);
    }
  }, []);

  React.useEffect(() => {
    const panelElement = getPanelElement('sidebar');
    if (panelElement) {
      const updateWidth = () => {
        setSidebarWidth(panelElement.offsetWidth);
      };
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(panelElement);
      updateWidth();
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  const [dragging, setDragging] = React.useState(false);
  React.useLayoutEffect(() => {
    const resizeHandleElement = getResizeHandleElement('sidebar-handle');
    const panelElement = getPanelElement('sidebar');
    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-resize-handle-state') {
          const state = (mutation.target as HTMLElement).getAttribute('data-resize-handle-state');
          if (state === 'drag') {
            setDragging(true);
          }
          if (state !== 'drag' && dragging && panel && panelElement?.offsetWidth && panelElement.offsetWidth <= 150) {
            if (increasing) {
              panel.resize(25);
            } else {
              panel.collapse();
            }
            setDragging(false);
          }
        }
      }
    });
    if (resizeHandleElement) {
      observer.observe(resizeHandleElement, { attributes: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [panel, dragging, increasing]);

  React.useEffect(() => {
    const hidenav = (e: KeyboardEvent) => {
      if (navOpen && e.key === 'Escape') {
        setNavOpen(false);
      }
    };

    document.addEventListener('keyup', hidenav);

    return () => {
      document.removeEventListener('keyup', hidenav);
    };
  }, [navOpen]);

  return (
    <TooltipProvider delayDuration={0}>
      {navOpen && (
        <div
          data-state={navOpen ? 'open' : 'closed'}
          className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <Header isCollapsed={isCollapsed} panel={panel} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={sizes => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/`;

          const currentSize = sizes[0];
          const prevSize = sizeRef.current;

          if (prevSize !== null) {
            if (currentSize > prevSize) {
              setIncreasing(true);
            } else if (currentSize < prevSize) {
              setIncreasing(false);
            }
          }

          sizeRef.current = currentSize;
        }}
        className="h-full items-stretch w-full"
      >
        <ResizablePanel
          id="sidebar"
          ref={panelRef}
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={5}
          maxSize={25}
          onCollapse={() => {
            setIsCollapsed(true);
            collapseSidebar();
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(true)}; path=/`;
          }}
          onExpand={() => {
            setIsCollapsed(false);
            expandSidebar();
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(false)}; path=/`;
          }}
          className={cn(
            'flex flex-col max-w-[272px] max-md:fixed overflow-hidden max-md:z-50 max-md:top-0 max-md:left-0 max-md:h-full max-md:border-r max-md:backdrop-blur transition-transform ease-in-out duration-300 md:pt-12 max-md:max-w-3xs max-md:w-full max-md:!bg-background min-h-0',
            isCollapsed && 'min-w-0 max-w-0 max-md:max-w-0 transition-all duration-300 ease-in-out',
            navOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
          )}
        >
          <div data-collapsed={isCollapsed} className="group flex flex-col gap-4 py-1 data-[collapsed=true]:py-2 md:hidden">
            <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
              {isCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setNavOpen(false)}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-9 w-9', 'dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white')}
                    >
                      <XIcon className="h-4 w-4" />
                      <span className="sr-only">Hide</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-4">
                    Hide
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button onClick={() => setNavOpen(false)} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start')}>
                  <XIcon className="mr-2 h-4 w-4" />
                  Hide
                </button>
              )}
            </nav>
          </div>

          <Separator className="md:hidden bg-accent" />

          {/* Database Browser Content */}
          <div className="flex-1 overflow-y-auto -mx-2">
            <DatabaseBrowser />
          </div>
        </ResizablePanel>
        <ResizableHandle id="sidebar-handle" withHandle className="max-md:hidden z-20" />

        <ResizablePanel defaultSize={defaultLayout[1]} className="flex flex-col max-h-full h-full overflow-hidden min-h-0">
          <div className={cn('overflow-y-auto overflow-x-hidden max-md:pt-12 transition-[padding-top] h-full', isCollapsed && 'pt-12')}>{children}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
};
