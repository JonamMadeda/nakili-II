'use client';

import { useRef, useState, useCallback } from 'react';
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
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<Editor | null>(null);

  function hasMarkdown(text: string): boolean {
    return /(?:^|\s)(\*\*|__|~~|`|[*_]|^#{1,3}\s|^[-*]\s|^\d+\.\s)/m.test(text);
  }

  function markdownToHtml(text: string): string {
    const codeBlocks: string[] = [];
    let h = text.replace(/```([\s\S]*?)```/g, (_, c) => {
      const i = codeBlocks.length;
      codeBlocks.push(c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      return `\x00CB${i}\x00`;
    });

    const inlineCodes: string[] = [];
    h = h.replace(/`([^`]+)`/g, (_, c) => {
      const i = inlineCodes.length;
      inlineCodes.push(c);
      return `\x00IC${i}\x00`;
    });

    h = h.replace(/(?<!\S)\*\*\*(?!\s)(.+?)(?<!\s)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/(?<!\S)\*\*(?!\s)(.+?)(?<!\s)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(?<!\S)__(?!\s)(.+?)(?<!\s)__/g, '<strong>$1</strong>');
    h = h.replace(/(?<!\S)\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>');
    h = h.replace(/(?<!\S)_(?!\s)(.+?)(?<!\s)_/g, '<em>$1</em>');
    h = h.replace(/(?<!\S)~~(.+?)(?<!\s)~~/g, '<s>$1</s>');

    h = h.replace(/(?<=\s)[*_~]{2,}(?=\s)/g, '');

    h = h.replace(/\x00IC(\d+)\x00/g, (_, i) => `<code>${inlineCodes[+i]}</code>`);

    const blocks = h.split(/\n\s*\n/);
    const out: string[] = [];

    for (const block of blocks) {
      const t = block.trim();
      if (!t) continue;

      if (/^#{1,3}\s/.test(t)) {
        const lvl = t.startsWith('###') ? 3 : t.startsWith('##') ? 2 : 1;
        out.push(`<h${lvl}>${t.replace(/^#{1,3}\s+/, '')}</h${lvl}>`);
        continue;
      }

      if (/^---+$/.test(t)) { out.push('<hr>'); continue; }

      const lines = t.split('\n');
      const segs: { type: 'list' | 'text'; lines: string[]; ordered?: boolean }[] = [];
      let cur: typeof segs[0] | null = null;

      for (const line of lines) {
        const ul = line.match(/^[-*]\s+(.+)$/);
        const ol = line.match(/^\d+\.\s+(.+)$/);
        const isList = !!(ul || ol);
        if (!cur || cur.type !== (isList ? 'list' : 'text') || (isList && cur.type === 'list' && cur.ordered !== !!ol)) {
          if (cur) segs.push(cur);
          cur = isList ? { type: 'list', lines: [], ordered: !!ol } : { type: 'text', lines: [] };
        }
        cur.lines.push(isList ? (ul ? ul[1] : ol![1]) : line);
      }
      if (cur) segs.push(cur);

      for (const s of segs) {
        if (s.type === 'list') {
          out.push((s.ordered ? '<ol>' : '<ul>') + s.lines.map(c => `<li>${c}</li>`).join('') + (s.ordered ? '</ol>' : '</ul>'));
        } else {
          const j = s.lines.join('<br>').trim();
          if (j) out.push(`<p>${j}</p>`);
        }
      }
    }

    return out.join('\n').replace(/\x00CB(\d+)\x00/g, (_, i) => `<pre><code>${codeBlocks[+i]}</code></pre>`);
  }

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
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text || !hasMarkdown(text)) return false;

        event.preventDefault();
        const html = markdownToHtml(text);
        editorRef.current?.chain().insertContent(html).focus().run();
        return true;
      },
    },
  });

  editorRef.current = editor;

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
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
      <div className="flex-1 overflow-y-auto min-h-0">
        <EditorContent editor={editor} />
      </div>
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
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
