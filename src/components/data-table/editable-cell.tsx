'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: any;
  dataType?: string;
  isActive: boolean;
  isEditing: boolean;
  isChanged?: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditable?: boolean;
  className?: string;
}

export function EditableCell({ 
  value, 
  dataType, 
  isActive, 
  isEditing, 
  isChanged = false, 
  onActivate, 
  onEdit, 
  onChange, 
  onSave, 
  onCancel, 
  isEditable = true, 
  className 
}: EditableCellProps) {
  const [editValue, setEditValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Update edit value when value prop changes
  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSingleClick = () => {
    if (!isEditable) return;
    onActivate();
  };

  const handleDoubleClick = () => {
    if (!isEditable) return;
    onEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(editValue);
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value); // Reset to original value
      onCancel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setEditValue(checked);
    onChange(checked);
    onSave();
  };

  const handleInputBlur = () => {
    // Only save if the value actually changed
    if (editValue !== value) {
      onChange(editValue);
    }
    onSave();
  };

  const renderDisplayValue = () => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">NULL</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="font-mono">{value.toString()}</span>;
    }

    if (typeof value === 'object') {
      return <span className="font-mono text-sm">{JSON.stringify(value)}</span>;
    }

    return <span className="break-all">{String(value)}</span>;
  };

  const renderEditInput = () => {
    // Handle different data types for editing
    if (dataType === 'boolean' || typeof value === 'boolean') {
      return <Checkbox checked={!!editValue} onCheckedChange={handleCheckboxChange} className="mt-1" />;
    }

    // Determine input type based on data type
    let inputType = 'text';
    if (dataType?.includes('int') || dataType?.includes('numeric') || dataType?.includes('decimal')) {
      inputType = 'number';
    } else if (dataType?.includes('date')) {
      inputType = 'date';
    } else if (dataType?.includes('time')) {
      inputType = 'datetime-local';
    }

    return (
      <Input
        ref={inputRef}
        type={inputType}
        value={editValue || ''}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        className="!size-full text-sm !border-0 shadow-none outline-none focus-visible:!ring-0 !p-2 !bg-transparent font-mono rounded-none"
      />
    );
  };

  if (!isEditable) {
    return <div className={cn('p-2 size-full flex items-center', className)}>{renderDisplayValue()}</div>;
  }

  return (
    <div
      className={cn(
        'truncate min-w-0 size-full ring-inset', 
        isActive && 'bg-tertiary/5 ring-2 ring-tertiary', 
        isEditing && 'bg-brand-saffron ring-2 ring-brand-saffron-primary',
        isChanged && !isEditing && 'bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-yellow-500',
        className
      )}
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? renderEditInput() : <div className="p-2">{renderDisplayValue()}</div>}
    </div>
  );
}
