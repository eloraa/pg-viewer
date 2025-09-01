'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Editor, getEditorLanguage, type EditorLanguage } from '@/components/ui/editor';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlignJustifyIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/store/theme';

interface MonacoEditorPopoverProps {
  value: unknown;
  dataType?: string;
  nullable?: boolean;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  ancorClass?: string;
}

export function MonacoEditorPopover({ value, dataType, nullable = false, onSave, onCancel, trigger, children, disabled = false, className, ancorClass }: MonacoEditorPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [editorValue, setEditorValue] = React.useState('');
  const [language, setLanguage] = React.useState<EditorLanguage>('plaintext');
  const { theme } = useTheme();

  const handleSave = React.useCallback(() => {
    let processedValue: unknown = editorValue;

    // Try to parse JSON if it looks like JSON
    if (language === 'json' && editorValue.trim()) {
      try {
        processedValue = JSON.parse(editorValue);
      } catch {
        // If JSON parsing fails, keep as string
        processedValue = editorValue;
      }
    } else if (editorValue === '') {
      // Handle empty values - convert to null if nullable, otherwise keep as empty string
      processedValue = nullable ? null : '';
    }

    onSave(processedValue);
    setIsOpen(false);
  }, [editorValue, language, nullable, onSave]);

  const handleCancel = React.useCallback(() => {
    onCancel();
    setIsOpen(false);
  }, [onCancel]);

  // Initialize editor value and language when popover opens
  React.useEffect(() => {
    if (isOpen) {
      // Convert value to string for editor
      let stringValue = '';
      if (value === null || value === undefined) {
        stringValue = '';
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value, null, 2);
      } else {
        stringValue = String(value);
      }

      setEditorValue(stringValue);
      setLanguage(getEditorLanguage(dataType));
    }
  }, [isOpen, value, dataType]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleCancel, handleSave]);

  const handleSetNull = () => {
    onSave(null);
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className={cn('h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200', className)} disabled={disabled}>
      <AlignJustifyIcon className="size-3" />
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      {children && <PopoverAnchor className={ancorClass}>{children}</PopoverAnchor>}
      <PopoverContent className="w-[600px] h-[400px] p-0 flex flex-col rounded-none" align="start">
        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            value={editorValue}
            onChange={setEditorValue}
            language={language}
            height="100%"
            options={{
              fontSize: 12,
              lineNumbers: 'off',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              theme: theme === 'dark' ? 'vs-dark' : 'light',
              padding: { top: 16 },
              inlayHints: { enabled: 'off' },
            }}
          />
        </div>

        {/* Footer with buttons */}
        <div className="flex items-center justify-between p-3 border-t bg-muted/20">
          <div>
            <Button variant="outline" size="sm" onClick={handleSetNull} className="text-xs">
              Set <i>NULL</i>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs">
              Cancel (Esc)
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs">
              Save (Ctrl+Enter)
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
