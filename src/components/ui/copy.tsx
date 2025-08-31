'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

export function Copy({ link, children, iconOnly, className = '', onCopy }: { link?: string | null; children?: React.ReactNode; iconOnly?: boolean; className?: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          textArea.remove();
          return true;
        } catch (error) {
          console.error('Failed to copy text:', error);
          textArea.remove();
          return false;
        }
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
      return false;
    }
  };

  const handleCopy = async () => {
    if (timer) clearTimeout(timer);
    const success = await copyToClipboard(link || '');
    if (success) {
      setCopied(true);
      setTimer(setTimeout(() => setCopied(false), 1000));
      // Call the optional callback after successful copy
      onCopy?.();
    }
  };

  if (iconOnly) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0} open={copied || hover}>
          <TooltipTrigger asChild>
            <button
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onClick={handleCopy}
              className={cn('flex items-center text-tertiary', copied && 'bg-tertiary text-tertiary-foreground')}
            >
              {copied ? <CheckIcon className="w-4 h-4 min-w-4" /> : <CopyIcon className="w-4 h-4 min-w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? 'Copied' : 'Click to copy'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0} open={copied || hover}>
        <TooltipTrigger asChild>
          <button
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={handleCopy}
            className={cn('flex gap-1 items-center text-sm truncate cursor-pointer text-tertiary', copied && '!bg-tertiary !text-tertiary-foreground', className)}
          >
            {copied ? <CheckIcon className={cn('size-4 min-w-4', !copied && 'text-current')} /> : <CopyIcon className={cn('size-4 min-w-4', !copied && ' text-current')} />}
            {children || <span className="border-b border-dotted border-primary/50 truncate min-w-0">{link}</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied' : 'Click to copy'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default Copy;
