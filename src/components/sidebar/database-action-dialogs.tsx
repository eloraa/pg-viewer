'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateSchemaForm } from './forms/create-schema-form';
import { CreateTableForm } from './forms/create-table-form';
import { CreateViewForm } from './forms/create-view-form';
import { CreateEnumForm } from './forms/create-enum-form';
import { CreateRoleForm } from './forms/create-role-form';
import { cn } from '@/lib/utils';

export type DatabaseAction = 'create-schema' | 'create-table' | 'create-view' | 'create-enum' | 'create-role' | 'create-policy';

interface DatabaseActionDialogsProps {
  action: DatabaseAction | null;
  isOpen: boolean;
  onClose: () => void;
  selectedSchema?: string | null;
}

export function DatabaseActionDialogs({ action, isOpen, onClose, selectedSchema }: DatabaseActionDialogsProps) {
  const handleSuccess = () => {
    onClose();
  };

  const getDialogTitle = () => {
    switch (action) {
      case 'create-schema':
        return 'Create Schema';
      case 'create-table':
        return 'Create Table';
      case 'create-view':
        return 'Create View';
      case 'create-enum':
        return 'Create Enum';
      case 'create-role':
        return 'Create Role';
      case 'create-policy':
        return 'Create Policy';
      default:
        return 'Database Action';
    }
  };

  const renderForm = () => {
    switch (action) {
      case 'create-schema':
        return <CreateSchemaForm onSuccess={handleSuccess} />;
      case 'create-table':
        return selectedSchema ? <CreateTableForm schemaName={selectedSchema} onSuccess={handleSuccess} /> : <div className="text-sm text-muted-foreground">Please select a schema first.</div>;
      case 'create-view':
        return selectedSchema ? <CreateViewForm schemaName={selectedSchema} onSuccess={handleSuccess} /> : <div className="text-sm text-muted-foreground">Please select a schema first.</div>;
      case 'create-enum':
        return selectedSchema ? <CreateEnumForm schemaName={selectedSchema} onSuccess={handleSuccess} /> : <div className="text-sm text-muted-foreground">Please select a schema first.</div>;
      case 'create-role':
        return <CreateRoleForm onSuccess={handleSuccess} />;
      case 'create-policy':
        return <div className="text-sm text-muted-foreground">Policy creation form coming soon...</div>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-[600px] max-h-[80vh] overflow-y-auto', action === 'create-view' && 'md:max-w-3xl')}>
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{renderForm()}</div>
      </DialogContent>
    </Dialog>
  );
}
