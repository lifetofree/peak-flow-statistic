import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft } from 'lucide-react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  readOnly = false,
  minHeight = '150px'
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const lastValue = useRef(value);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (editorRef.current && !readOnly) {
      // Always update on first render or if value changed from outside
      if (!isInitialized.current || value !== lastValue.current) {
        editorRef.current.innerHTML = value;
        lastValue.current = value;
        isInitialized.current = true;
      }
    }
  }, [value, readOnly]);

  const execCommand = (command: string, commandValue: string | null = null) => {
    document.execCommand(command, false, commandValue);
    if (editorRef.current) {
      const newHTML = editorRef.current.innerHTML;
      lastValue.current = newHTML;
      onChange(newHTML);
    }
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newHTML = editorRef.current.innerHTML;
      lastValue.current = newHTML;
      onChange(newHTML);
    }
  };

  const Toolbar = () => (
    <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
      <button
        type="button"
        onClick={() => execCommand('bold')}
        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => execCommand('italic')}
        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        title="Italic (Ctrl+I)"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => execCommand('underline')}
        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        title="Underline (Ctrl+U)"
      >
        <Underline size={16} />
      </button>
      <div className="w-px bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => execCommand('insertUnorderedList')}
        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => execCommand('insertOrderedList')}
        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-px bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => execCommand('justifyLeft')}
        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
    </div>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {!readOnly && <Toolbar />}
      {!readOnly ? (
        <div
          ref={editorRef}
          contentEditable={true}
          onInput={handleInput}
          className="p-4 outline-none prose prose-sm max-w-none bg-white relative"
          style={{ minHeight, cursor: 'text' }}
          data-placeholder={placeholder}
          suppressHydrationWarning
        />
      ) : (
        <div
          className="p-4 outline-none prose prose-sm max-w-none bg-white"
          style={{ minHeight, cursor: 'default' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
        />
      )}
    </div>
  );
}
