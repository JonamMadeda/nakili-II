'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Editor, Extension } from '@tiptap/core';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
  onEditorReady?: (editor: Editor) => void;
  /** Identity of the document in the editor. When it changes, the same
      editor instance loads the new content instead of remounting. */
  pageId?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  showToolbar = true,
  onEditorReady,
  pageId,
}: RichTextEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const switchingRef = useRef(false);
  const mountedPageRef = useRef<string | undefined>(undefined);

  const FontSizeExt = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
      return [{
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: el => el.style.fontSize,
            renderHTML: attrs => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      }];
    },
  });

  const fontSizeOptions = ['12px', '14px', '16px', '18px', '24px', '32px'];

  const toggleHeading = useCallback((level: 1 | 2 | 3) => {
    const editor = editorRef.current!;
    const pos = editor.state.selection.anchor;
    editor.chain().focus().setTextSelection(pos).toggleHeading({ level }).run();
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      FontSizeExt,
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      if (switchingRef.current) return;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[280px] px-4 py-3',
      },
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || pageId === undefined) return;
    if (mountedPageRef.current === undefined) {
      mountedPageRef.current = pageId;
      return;
    }
    if (mountedPageRef.current === pageId) return;
    mountedPageRef.current = pageId;
    switchingRef.current = true;
    try {
      editor.commands.setContent(content);
    } finally {
      switchingRef.current = false;
    }
  }, [editor, pageId]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {showToolbar && (
        <div className="flex-shrink-0 flex flex-wrap items-center gap-0.5 p-2 bg-slate-50 border-b border-slate-200 shadow-sm">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <span className="font-bold text-sm">B</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <span className="italic text-sm">I</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline"
          >
            <span className="underline text-sm">U</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <span className="text-sm" style={{ textDecoration: 'line-through' }}>S</span>
          </ToolbarButton>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <select
            value={editor.getAttributes('textStyle').fontSize || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                editor.chain().focus().unsetMark('textStyle').run();
              } else {
                editor.chain().focus().setMark('textStyle', { fontSize: val }).run();
              }
            }}
            className="h-7 text-xs rounded border border-slate-300 bg-white px-1.5 text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
            title="Font Size"
          >
            <option value="">Size</option>
            {fontSizeOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <ToolbarButton
            onClick={() => toggleHeading(1)}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <span className="text-xs font-bold">H1</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => toggleHeading(2)}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => toggleHeading(3)}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M3 15h18" />
            </svg>
          </ToolbarButton>
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            isActive={false}
            title="Undo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h13a4 4 0 010 8H7" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6l-4 4 4 4" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            isActive={false}
            title="Redo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H8a4 4 0 000 8h9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 6l4 4-4 4" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            isActive={false}
            title="Clear formatting"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 10.5L21 3m-5 5l-7 7m5-5l2-2-2-2-2 2M3 21l3-3m0 0l3-3-3-3-3 3m3 3l3-3" />
            </svg>
          </ToolbarButton>
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        <EditorContent editor={editor} />
      </div>
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #64748b;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .ProseMirror h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
        .ProseMirror h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror p { margin-bottom: 0.5rem; }
      `}</style>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-slate-600 hover:bg-slate-200'
      )}
    >
      {children}
    </button>
  );
}
