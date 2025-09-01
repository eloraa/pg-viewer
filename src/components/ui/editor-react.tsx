'use client';

import * as React from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useTheme } from '@/store/theme';

export type EditorLanguage = 'json' | 'sql' | 'javascript' | 'typescript' | 'html' | 'css' | 'markdown' | 'plaintext';

interface EditorReactProps {
  value: string;
  onChange: (value: string) => void;
  language?: EditorLanguage;
  height?: number | string;
  width?: number | string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  className?: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
}

export const EditorReact = React.forwardRef<monaco.editor.IStandaloneCodeEditor | null, EditorReactProps>(
  ({ 
    value, 
    onChange, 
    language = 'plaintext', 
    height = 200, 
    width = '100%', 
    options = {}, 
    className,
    onMount,
    theme: propTheme
  }, ref) => {
    const { theme: currentTheme } = useTheme();
    const editorTheme = propTheme || (currentTheme === 'dark' ? 'vs-dark' : 'vs-light');
    const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: 'line',
      fontSize: 14,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      renderWhitespace: 'selection',
      renderControlCharacters: false,
      fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
      ...options,
    };

    const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      
      // Expose editor instance through ref
      if (ref) {
        if (typeof ref === 'function') {
          ref(editor);
        } else {
          ref.current = editor;
        }
      }

      // Add SQL syntax highlighting and autocompletion
      if (language === 'sql') {
        monaco.languages.registerCompletionItemProvider('sql', {
          provideCompletionItems: (model, position) => {
            const suggestions = [
              {
                label: 'SELECT',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'SELECT',
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column,
                },
              },
              {
                label: 'FROM',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'FROM',
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column,
                },
              },
              {
                label: 'WHERE',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'WHERE',
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column,
                },
              },
              {
                label: 'ORDER BY',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'ORDER BY',
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column,
                },
              },
              {
                label: 'GROUP BY',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'GROUP BY',
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column,
                },
              },
              {
                label: 'LIMIT',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'LIMIT',
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column,
                },
              },
            ];
            return { suggestions };
          },
        });
      }

      // Call onMount callback if provided
      if (onMount) {
        onMount(editor, monaco);
      }
    };

    const handleEditorChange = (value: string | undefined) => {
      onChange(value || '');
    };

    return (
      <div className={className} style={{ width, height }}>
        <Editor
          height={height}
          width={width}
          language={language}
          value={value}
          theme={editorTheme}
          options={defaultOptions}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
        />
      </div>
    );
  }
);

EditorReact.displayName = 'EditorReact';

// Helper function to determine language based on data type
export const getEditorLanguage = (dataType?: string): EditorLanguage => {
  if (!dataType) return 'plaintext';

  const type = dataType.toLowerCase();

  if (type.includes('json') || type.includes('jsonb')) {
    return 'json';
  }

  if (type.includes('text') || type.includes('varchar') || type.includes('char')) {
    return 'plaintext';
  }

  if (type.includes('html')) {
    return 'html';
  }

  if (type.includes('css')) {
    return 'css';
  }

  return 'plaintext';
};
