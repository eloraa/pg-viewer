'use client';

import * as React from 'react';
import * as monaco from 'monaco-editor';

// Define supported languages as string literals - this fixes the TypeScript error
export type EditorLanguage = 'json' | 'sql' | 'javascript' | 'typescript' | 'html' | 'css' | 'markdown' | 'plaintext';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: EditorLanguage;
  height?: number | string;
  width?: number | string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  className?: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export const Editor = React.forwardRef<monaco.editor.IStandaloneCodeEditor | null, EditorProps>(
  ({ value, onChange, language = 'plaintext', height = 200, width = '100%', options = {}, className, onMount }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [isEditorReady, setIsEditorReady] = React.useState(false);

    // Default editor options
    const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
      value,
      language,
      theme: 'vs-dark',
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
      ...options,
    };

    // Initialize Monaco editor
    React.useEffect(() => {
      if (!containerRef.current) return;

      // Create editor instance
      const editor = monaco.editor.create(containerRef.current, defaultOptions);

      editorRef.current = editor;
      setIsEditorReady(true);

      // Set up value change listener
      const subscription = editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        onChange(newValue);
      });

      // Call onMount callback if provided
      if (onMount) {
        onMount(editor);
      }

      // Expose editor instance through ref
      if (ref) {
        if (typeof ref === 'function') {
          ref(editor);
        } else {
          ref.current = editor;
        }
      }

      // Cleanup function
      return () => {
        subscription.dispose();
        editor.dispose();
        if (ref) {
          if (typeof ref === 'function') {
            ref(null);
          } else {
            ref.current = null;
          }
        }
      };
    }, []);

    // Update editor value when prop changes (controlled input)
    React.useEffect(() => {
      if (isEditorReady && editorRef.current) {
        const currentValue = editorRef.current.getValue();
        if (currentValue !== value) {
          editorRef.current.setValue(value);
        }
      }
    }, [value, isEditorReady]);

    // Update editor language when prop changes
    React.useEffect(() => {
      if (isEditorReady && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, language);
        }
      }
    }, [language, isEditorReady]);

    // Handle editor resize
    React.useEffect(() => {
      if (isEditorReady && editorRef.current) {
        editorRef.current.layout();
      }
    }, [width, height, isEditorReady]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
      />
    );
  }
);

Editor.displayName = 'Editor';

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
