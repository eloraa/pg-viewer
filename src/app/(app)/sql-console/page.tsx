'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Database, Search, CopyIcon, Play, Download, FileText, TableIcon, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Copy } from '@/components/ui/copy';
import { EditorReact } from '@/components/ui/editor-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { executeRawSQL } from '@/lib/server/actions';
import { searchItems } from '@/lib/search';
import * as monaco from 'monaco-editor';

interface QueryResult {
  success: boolean;
  data: any[];
  rowCount: number;
  executionTime: number;
  message?: string;
  error?: string;
}

interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  table_name: string;
  is_primary_key?: boolean;
  foreign_table_name?: string;
  foreign_column_name?: string;
}

interface SchemaTable {
  table_name: string;
  columns: SchemaColumn[];
  constraints?: any[];
  indexes?: any[];
}

export default function SQLConsolePage() {
  const [query, setQuery] = React.useState('SELECT * FROM information_schema.tables LIMIT 10;');
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [schemaOpen, setSchemaOpen] = React.useState(false);
  const [schema, setSchema] = React.useState<SchemaTable[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTable, setSelectedTable] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'table' | 'code'>('table');
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = React.useRef<monaco.IDisposable | null>(null);

  const executeQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    try {
      const result = await executeRawSQL(query);
      setResult(result);
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

  const loadSchema = async () => {
    setIsLoadingSchema(true);
    try {
      // First get columns with primary key info
      const columnsQuery = `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.ordinal_position,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        LEFT JOIN (
          SELECT 
            tc.table_name,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
        ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position;
      `;

      // Get constraints separately
      const constraintsQuery = `
        SELECT 
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          pg_get_constraintdef(pgc.oid) as constraint_definition
        FROM information_schema.table_constraints tc
        JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name;
      `;

      // Get indexes separately
      const indexesQuery = `
        SELECT 
          tablename as table_name,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `;

      const [columnsResult, constraintsResult, indexesResult] = await Promise.all([executeRawSQL(columnsQuery), executeRawSQL(constraintsQuery), executeRawSQL(indexesQuery)]);

      if (columnsResult.success) {
        // Group columns by table
        const tableMap = new Map();

        columnsResult.data.forEach((row: any) => {
          if (!tableMap.has(row.table_name)) {
            tableMap.set(row.table_name, {
              table_name: row.table_name,
              columns: [],
              constraints: [],
              indexes: [],
            });
          }

          tableMap.get(row.table_name).columns.push({
            column_name: row.column_name,
            data_type: row.data_type,
            is_nullable: row.is_nullable,
            column_default: row.column_default,
            table_name: row.table_name,
            is_primary_key: row.is_primary_key,
          });
        });

        // Add constraints
        if (constraintsResult.success) {
          constraintsResult.data.forEach((row: any) => {
            const table = tableMap.get(row.table_name);
            if (table) {
              table.constraints.push({
                constraint_name: row.constraint_name,
                constraint_type: row.constraint_type,
                definition: row.constraint_definition,
              });
            }
          });
        }

        // Add indexes
        if (indexesResult.success) {
          indexesResult.data.forEach((row: any) => {
            const table = tableMap.get(row.table_name);
            if (table) {
              table.indexes.push({
                indexname: row.indexname,
                indexdef: row.indexdef,
              });
            }
          });
        }

        setSchema(Array.from(tableMap.values()));
        
        // Update completions when schema changes
        setTimeout(() => {
          if (editorRef.current) {
            if (completionProviderRef.current) {
              completionProviderRef.current.dispose();
            }
            completionProviderRef.current = registerSQLCompletions(editorRef.current);
          }
        }, 50);
      }
    } catch (error) {
      console.error('Failed to load schema:', error);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        executeQuery();
      }
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        setSchemaOpen(true);
        if (schema.length === 0) {
          loadSchema();
        }
      }
    },
    [query, schema.length]
  );

  const copyColumnName = (columnName: string, tableName: string) => {
    const fullColumnName = `${tableName}.${columnName}`;
    navigator.clipboard.writeText(fullColumnName);
    toast.success(`Copied ${fullColumnName}`);
  };

  const insertColumnIntoEditor = (columnName: string, tableName: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const fullColumnName = `${tableName}.${columnName}`;

      if (selection) {
        editor.executeEdits('insert-column', [
          {
            range: selection,
            text: fullColumnName,
          },
        ]);
      }
    }
    setSchemaOpen(false);
  };

  // Helper function to shorten data types
  const shortenDataType = (dataType: string): string => {
    const typeMap: { [key: string]: string } = {
      'character varying': 'VARCHAR',
      'timestamp without time zone': 'TIMESTAMP',
      'timestamp with time zone': 'TIMESTAMPTZ',
      integer: 'INT',
      bigint: 'BIGINT',
      smallint: 'SMALLINT',
      boolean: 'BOOL',
      text: 'TEXT',
      uuid: 'UUID',
      jsonb: 'JSONB',
      json: 'JSON',
    };
    return typeMap[dataType.toLowerCase()] || dataType.toUpperCase();
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Clean up completion provider on unmount
  React.useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  // Register SQL completion provider
  const registerSQLCompletions = React.useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    console.log('Registering SQL completions with schema:', schema.length, 'tables');
    
    const completionProvider = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        console.log('Providing completions, schema has', schema.length, 'tables');
        
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: monaco.languages.CompletionItem[] = [];

        // Add table suggestions
        schema.forEach(table => {
          suggestions.push({
            label: table.table_name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.table_name,
            detail: 'Table',
            documentation: `Table: ${table.table_name}`,
            range: range
          });

          // Add column suggestions with table prefix
          table.columns.forEach(column => {
            suggestions.push({
              label: `${table.table_name}.${column.column_name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${table.table_name}.${column.column_name}`,
              detail: `${shortenDataType(column.data_type)}${column.is_primary_key ? ' (PK)' : ''}${column.is_nullable === 'NO' ? ' NOT NULL' : ''}`,
              documentation: `Column: ${column.column_name} (${column.data_type})`,
              range: range
            });

            // Add column suggestions without table prefix for when user is already in context
            suggestions.push({
              label: column.column_name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: column.column_name,
              detail: `${table.table_name}.${column.column_name} - ${shortenDataType(column.data_type)}${column.is_primary_key ? ' (PK)' : ''}`,
              documentation: `Column: ${column.column_name} from ${table.table_name} (${column.data_type})`,
              range: range
            });
          });
        });

        // Add SQL keywords
        const sqlKeywords = [
          'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
          'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'UPDATE', 'DELETE',
          'CREATE', 'DROP', 'ALTER', 'INDEX', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
          'NOT NULL', 'UNIQUE', 'DEFAULT', 'CHECK', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
          'BETWEEN', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL', 'DISTINCT', 'COUNT', 'SUM',
          'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'ON', 'USING'
        ];

        sqlKeywords.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'SQL Keyword',
            range: range
          });
        });

        console.log('Returning', suggestions.length, 'suggestions');
        return { suggestions };
      }
    });

    return completionProvider;
  }, [schema, shortenDataType]);

  const generateMarkdown = () => {
    if (!result?.data?.length) return '';

    const columns = Object.keys(result.data[0]);

    const columnWidths = columns.map(col => {
      const headerLength = col.length;
      const maxDataLength = Math.max(
        ...result.data.map(row => {
          const value = row[col];
          if (value === null) return 4;
          if (typeof value === 'object') return JSON.stringify(value).length;
          return String(value).length;
        })
      );
      return Math.max(headerLength, maxDataLength, 3);
    });

    const headerRow = '| ' + columns.map((col, i) => col.padEnd(columnWidths[i])).join(' | ') + ' |';
    const separatorRow = '| ' + columnWidths.map(width => '-'.repeat(width)).join(' | ') + ' |';

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

  const exportData = (format: 'json' | 'csv' | 'xlsx') => {
    if (!result?.data?.length) return;

    if (format === 'json') {
      const jsonData = JSON.stringify(result.data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'query-result.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported to JSON');
    } else if (format === 'csv') {
      const headers = Object.keys(result.data[0]);
      const csvContent = [
        headers.join(','),
        ...result.data.map(row =>
          headers
            .map(header => {
              const value = row[header];
              if (value === null) return '';
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            })
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'query-result.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported to CSV');
    }
  };

  // Use fuzzy search for better filtering
  const filteredTables = React.useMemo(() => {
    if (!searchTerm.trim()) return schema;

    const searchableItems = schema.map(table => ({
      ...table,
      searchText: table.table_name,
    }));

    return searchItems(searchableItems, searchTerm, {
      getText: item => item.table_name,
      getKeywords: item => item.columns.map((col: SchemaColumn) => col.column_name),
      limit: 50,
      minScore: 0.1,
    }).map(result => result.item);
  }, [schema, searchTerm]);

  const selectedTableData = selectedTable ? schema.find(t => t.table_name === selectedTable) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Dialog open={schemaOpen} onOpenChange={setSchemaOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => schema.length === 0 && loadSchema()}>
              <Database className="h-4 w-4 mr-2" />
              Database Schema (Ctrl+J)
            </Button>
          </DialogTrigger>
          <DialogContent className="md:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="flex h-full">
              {/* Left Sidebar - Tables */}
              <div className="w-80 border-r flex flex-col">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search for entities..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-muted/50" />
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {isLoadingSchema ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground text-sm">Loading schema...</div>
                    </div>
                  ) : (
                    <div className="p-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 px-2">public</div>
                      {filteredTables.map(table => (
                        <div
                          key={table.table_name}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 ${selectedTable === table.table_name ? 'bg-muted' : ''}`}
                          onClick={() => setSelectedTable(table.table_name)}
                        >
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{table.table_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Columns */}
              <div className="flex-1 flex flex-col">
                {selectedTableData ? (
                  <>
                    <div className="p-3 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">table_name</span>
                        <span className="text-xs text-muted-foreground">schema</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-mono">{selectedTableData.table_name}</span>
                        <span className="text-sm text-muted-foreground">public</span>
                      </div>
                    </div>

                    <div className="p-3 border-b">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">COLUMNS</div>
                    </div>

                    <div className="flex-1 overflow-auto">
                      {selectedTableData.columns.map(column => (
                        <div
                          key={column.column_name}
                          className="px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-muted/20"
                          onClick={e => {
                            e.preventDefault();
                            copyColumnName(column.column_name, selectedTableData.table_name);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">{column.column_name}</span>
                            <span className="text-xs text-muted-foreground">{shortenDataType(column.data_type)}</span>
                            {column.is_primary_key && <span className="text-xs text-red-500">PRIMARY KEY</span>}
                            {column.is_nullable === 'NO' && !column.is_primary_key && <span className="text-xs text-red-500">NOT NULL</span>}
                          </div>
                        </div>
                      ))}

                      {/* Constraints Section */}
                      {selectedTableData.constraints && selectedTableData.constraints.length > 0 && (
                        <>
                          <div className="p-3 border-b bg-muted/10">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">CONSTRAINTS</div>
                          </div>
                          {selectedTableData.constraints.map((constraint: any, index: number) => {
                            // Extract useful information from constraint definition
                            const getUsefulConstraintInfo = (constraint: any) => {
                              const def = constraint.definition || '';
                              const type = constraint.constraint_type;

                              if (type === 'PRIMARY KEY') {
                                // Extract column name from "PRIMARY KEY (column_name)"
                                const match = def.match(/PRIMARY KEY \(([^)]+)\)/);
                                return match ? match[1] : constraint.constraint_name;
                              } else if (type === 'FOREIGN KEY') {
                                // Extract "table.column REFERENCES other_table(other_column)"
                                const match = def.match(/FOREIGN KEY \(([^)]+)\) REFERENCES ([^(]+)\(([^)]+)\)/);
                                if (match) {
                                  return `${match[1]} -> ${match[2].trim()}(${match[3]})`;
                                }
                                return constraint.constraint_name;
                              } else if (type === 'CHECK') {
                                // For CHECK constraints, copy the constraint name as it's more useful
                                return constraint.constraint_name;
                              } else if (type === 'UNIQUE') {
                                // Extract column name from "UNIQUE (column_name)"
                                const match = def.match(/UNIQUE \(([^)]+)\)/);
                                return match ? `UNIQUE ${match[1]}` : constraint.constraint_name;
                              }

                              return constraint.constraint_name;
                            };

                            const copyText = getUsefulConstraintInfo(constraint);

                            return (
                              <div
                                key={index}
                                className="px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-muted/20"
                                onClick={e => {
                                  e.preventDefault();
                                  navigator.clipboard.writeText(copyText);
                                  toast.success(`Copied ${copyText}`);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono">{constraint.constraint_name}</span>
                                  <span className="text-xs text-muted-foreground">{constraint.constraint_type}</span>
                                </div>
                                {constraint.definition && <div className="text-xs text-muted-foreground mt-1 font-mono">{constraint.definition}</div>}
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Indexes Section */}
                      {selectedTableData.indexes && selectedTableData.indexes.length > 0 && (
                        <>
                          <div className="p-3 border-b bg-muted/10">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">INDEXES</div>
                          </div>
                          {selectedTableData.indexes.map((index: any, idx: number) => (
                            <div
                              key={idx}
                              className="px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-muted/20"
                              onClick={e => {
                                e.preventDefault();
                                navigator.clipboard.writeText(index.indexname);
                                toast.success(`Copied ${index.indexname}`);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono">{index.indexname}</span>
                                <span className="text-xs text-muted-foreground">{index.indexdef?.includes('UNIQUE') ? 'UNIQUE INDEX' : 'INDEX'}</span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a table to view its columns</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={executeQuery} disabled={isExecuting || !query.trim()} size="sm" className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Run (Ctrl+Enter)
        </Button>
      </div>

      {/* Editor and Results with Resizable Panels */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="vertical" className="h-full">
          {/* Editor Panel */}
          <ResizablePanel defaultSize={result ? 60 : 100} minSize={30}>
            <EditorReact
              value={query}
              onChange={setQuery}
              language="sql"
              height="100%"
              options={{
                padding: { top: 16 },
              }}
              onMount={editor => {
                editorRef.current = editor;

                // Add Ctrl+Enter shortcut
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  executeQuery();
                });

                // Add Ctrl+J shortcut for schema
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
                  setSchemaOpen(true);
                  if (schema.length === 0) {
                    loadSchema();
                  }
                });

                // Always load schema and register completions
                loadSchema().then(() => {
                  // Wait a bit for state to update, then register completions
                  setTimeout(() => {
                    if (completionProviderRef.current) {
                      completionProviderRef.current.dispose();
                    }
                    completionProviderRef.current = registerSQLCompletions(editor);
                  }, 100);
                });
              }}
            />
          </ResizablePanel>

          {/* Results Panel */}
          {result && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 border-b">
                    {result.success ? <CheckCircle2 className="h-4 w-4 text-success-primary" /> : <AlertCircle className="h-4 w-4 text-destructive-primary" />}
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs font-mono">{result.executionTime}ms</span>
                      <span className="text-xs font-mono">
                        {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}
                      </span>

                      {result.success && result.data.length > 0 && (
                        <>
                          <Separator orientation="vertical" className="h-4" />

                          {/* View Toggle Buttons */}
                          <div className="flex items-center border rounded-md">
                            <Button variant={viewMode === 'table' ? 'ghost' : 'secondary'} size="icon" onClick={() => setViewMode('table')} className="rounded-r-none shadow-none border-r h-7 px-2">
                              <TableIcon className="h-3 w-3" />
                            </Button>
                            <Button variant={viewMode === 'code' ? 'ghost' : 'secondary'} size="icon" onClick={() => setViewMode('code')} className="rounded-l-none shadow-none h-7 px-2">
                              <Code2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Download Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="flex items-center gap-1 h-7 px-2">
                                <Download className="h-3 w-3" />
                                <span className="sr-only">Export</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => exportData('json')}>Export all to .json</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportData('csv')}>Export all to .csv</DropdownMenuItem>
                              <DropdownMenuItem disabled className="opacity-50">
                                Export all to .xlsx
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Copy link={generateMarkdown()} iconOnly>
                            <FileText className="h-3 w-3" />
                          </Copy>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {result.success && result.data.length > 0 ? (
                      viewMode === 'table' ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(result.data[0]).map(column => (
                                <TableHead key={column} className="text-xs">
                                  {column}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.data.map((row, index) => (
                              <TableRow key={index}>
                                {Object.values(row).map((value, cellIndex) => (
                                  <TableCell key={cellIndex} className="text-xs p-2">
                                    {value === null ? <span className="text-muted-foreground italic">NULL</span> : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <EditorReact
                          value={JSON.stringify(result.data, null, 2)}
                          onChange={() => {}} // Read-only, no-op onChange
                          language="json"
                          height="100%"
                          options={{
                            readOnly: true,
                            padding: { top: 16 },
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                          }}
                        />
                      )
                    ) : result.success ? (
                      <div className="text-muted-foreground text-center py-4 text-sm">Query executed successfully but returned no results.</div>
                    ) : null}

                    {(result.message || result.error) && (
                      <div className="p-2 text-xs border-t bg-muted/20">
                        {result.message && <p className="font-mono text-muted-foreground">{result.message}</p>}
                        {result.error && <p className="text-red-500 font-mono">{result.error}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
