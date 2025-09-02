'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileCode2Icon, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { executeRawSQL } from '@/lib/server/actions';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Copy } from '../ui/copy';
import { EditorReact } from '../ui/editor-react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface QueryResult {
  success: boolean;
  data: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  message?: string;
  error?: string;
}

export function SQLConsoleDialog() {
  const [query, setQuery] = React.useState('');
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const executeQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    try {
      const result = await executeRawSQL(query);
      setResult(result as QueryResult);
    } catch (error) {
      setResult({
        success: false,
        data: [],
        rowCount: 0,
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  };

  const resetDialog = () => {
    setQuery('');
    setResult(null);
    setIsExecuting(false);
  };

  const generateMarkdown = () => {
    if (!result?.data?.length) return '';

    const columns = Object.keys(result.data[0]);

    // Calculate column widths for better alignment
    const columnWidths = columns.map(col => {
      const headerLength = col.length;
      const maxDataLength = Math.max(
        ...result.data.map(row => {
          const value = row[col];
          if (value === null) return 4; // "NULL"
          if (typeof value === 'object') return JSON.stringify(value).length;
          return String(value).length;
        })
      );
      return Math.max(headerLength, maxDataLength, 3); // Minimum width of 3 for separator
    });

    // Create header row with proper spacing
    const headerRow = '| ' + columns.map((col, i) => col.padEnd(columnWidths[i])).join(' | ') + ' |';

    // Create separator row with proper alignment
    const separatorRow = '| ' + columnWidths.map(width => '-'.repeat(width)).join(' | ') + ' |';

    // Create data rows with proper spacing
    const dataRows = result.data.map(row => {
      const values = columns.map((col, i) => {
        const value = row[col];
        let displayValue: string;
        if (value === null) {
          displayValue = 'NULL';
        } else if (typeof value === 'object') {
          displayValue = JSON.stringify(value);
        } else {
          displayValue = String(value);
        }
        return displayValue.padEnd(columnWidths[i]);
      });
      return '| ' + values.join(' | ') + ' |';
    });

    return [headerRow, separatorRow, ...dataRows].join('\n');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={newOpen => {
        setOpen(newOpen);
        if (!newOpen) {
          resetDialog();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start cursor-pointer">
          <FileCode2Icon /> SQL Console
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:max-w-7xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2Icon className="h-5 w-5" />
            SQL Console
          </DialogTitle>
          <DialogDescription>Execute raw SQL queries against your database. Press Ctrl+Enter to execute.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
          <div className="space-y-4">
            <div onKeyDown={handleKeyDown}>
              <EditorReact value={query} onChange={setQuery} language="sql" height={400} className="border rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={executeQuery} disabled={isExecuting || !query.trim()} className="flex items-center gap-2" size="sm">
                <Play className="h-4 w-4" />
                {isExecuting ? 'Executing...' : 'Execute Query'}
              </Button>
              <Link href="/sql-console" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Advanced Console
                </Button>
              </Link>
              <span className="text-xs text-muted-foreground">Ctrl+Enter to execute</span>
            </div>
          </div>

          {result && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 border-b py-2">
                {result.success ? <CheckCircle2 className="h-4 w-4 text-brand-green-primary" /> : <AlertCircle className="h-4 w-4 text-destructive-primary" />}
                <span className="font-medium">Query Result</span>
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="outline" className="flex items-center gap-1">
                    {result.executionTime}ms
                  </Badge>
                  <Badge variant="outline">
                    {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}
                  </Badge>
                  {result.success && result.data.length > 0 && (
                    <Copy link={generateMarkdown()} iconOnly>
                      Copy as Markdown
                    </Copy>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {result.success && (
                  <>
                    {result.data.length > 0 && (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(result.data[0]).map(column => (
                                <TableHead key={column}>{column}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.data.map((row, index) => (
                              <TableRow key={index}>
                                {Object.values(row).map((value, cellIndex) => (
                                  <TableCell key={cellIndex} className="min-w-0 truncate p-2">
                                    {value === null ? <span className="text-muted-foreground italic">NULL</span> : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </div>
              {(result.message || result.error) && (
                <div className="pt-4 text-xs text-muted-foreground">
                  {result.message && <p className="font-mono">{result.message}</p>}
                  {result.error && <p className="text-destructive-primary">{result.error}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
