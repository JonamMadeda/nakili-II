'use client';

import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/core';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  editor: Editor | null;
  /** Render just the buttons (for embedding in a parent bar) without the
      toolbar's own background, border, and layout container. */
  bare?: boolean;
}

const fontSizeOptions = ['12px', '14px', '16px', '18px', '24px', '32px'];

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled = false,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cn(
        'p-1 rounded-md text-[13px] transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-slate-600'
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, bare = false }: EditorToolbarProps) {
  const [, setTick] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePos, setMorePos] = useState<{ top: number; right: number } | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((n) => n + 1);
    editor.on('transaction', bump);
    editor.on('selectionUpdate', bump);
    return () => {
      editor.off('transaction', bump);
      editor.off('selectionUpdate', bump);
    };
  }, [editor]);

  useEffect(() => {
    if (moreOpen) {
      const onPointer = (e: MouseEvent) => {
        if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
          setMoreOpen(false);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMoreOpen(false);
      };
      document.addEventListener('mousedown', onPointer);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onPointer);
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [moreOpen]);

  if (!editor) return null;

  const openMore = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const MENU_H = 220;
    const below = rect.bottom + 4;
    const top =
      below + MENU_H + 8 > window.innerHeight && rect.top - MENU_H - 4 > 8
        ? rect.top - MENU_H - 4
        : Math.min(below, window.innerHeight - MENU_H - 8);
    setMorePos({ top: Math.max(8, top), right: Math.max(8, window.innerWidth - rect.right) });
    setMoreOpen(true);
  };

  const setFontSize = (val: string) => {
    if (!val) {
      editor.chain().focus().unsetMark('textStyle').run();
    } else {
      editor.chain().focus().setMark('textStyle', { fontSize: val }).run();
    }
  };

  const toggleHeading = (level: 1 | 2 | 3) => {
    const pos = editor.state.selection.anchor;
    editor.chain().focus().setTextSelection(pos).toggleHeading({ level }).run();
  };

  const buttons = (
    <>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <span className="font-bold text-[13px]">B</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <span className="italic text-[13px]">I</span>
      </ToolbarButton>
      <div className="w-px h-5 bg-slate-200 mx-1" />
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
      <div className="w-px h-5 bg-slate-200 mx-1" />
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
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        isActive={false}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h13a4 4 0 010 8H7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6l-4 4 4 4" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        isActive={false}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H8a4 4 0 000 8h9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 6l4 4-4 4" />
        </svg>
      </ToolbarButton>
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton
        onClick={(e) => {
          if (moreOpen) {
            setMoreOpen(false);
          } else {
            openMore(e.currentTarget as HTMLElement);
          }
        }}
        isActive={moreOpen}
        title="More formatting options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </ToolbarButton>
    </>
  );

  const menu = moreOpen && morePos && (
      <div
        ref={moreRef}
        role="menu"
        aria-label="More formatting options"
        style={{ position: 'fixed', top: morePos.top, right: morePos.right, zIndex: 9999 }}
        className="bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 min-w-[200px]"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'w-full px-3.5 py-2 text-sm text-left flex items-center gap-3 transition-colors',
            editor.isActive('underline')
              ? 'bg-primary/10 text-primary'
              : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          <span className="underline w-4 text-center">U</span>
          Underline
          <span className="ml-auto text-[11px] text-slate-400">Ctrl+U</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            'w-full px-3.5 py-2 text-sm text-left flex items-center gap-3 transition-colors',
            editor.isActive('strike')
              ? 'bg-primary/10 text-primary'
              : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          <span className="w-4 text-center" style={{ textDecoration: 'line-through' }}>S</span>
          Strikethrough
        </button>
        <div className="my-1 border-t border-slate-100" />
        <div className="px-3.5 py-2 flex items-center gap-3">
          <span className="text-sm text-slate-700 flex-1">Font size</span>
          <select
            value={editor.getAttributes('textStyle').fontSize || ''}
            aria-label="Font size"
            onChange={(e) => setFontSize(e.target.value)}
            className="h-7 text-xs rounded border border-slate-300 bg-white px-1.5 text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Default</option>
            {fontSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="my-1 border-t border-slate-100" />
        <button
          type="button"
          role="menuitem"
          onClick={() => { editor.chain().focus().clearNodes().unsetAllMarks().run(); setMoreOpen(false); }}
          className="w-full px-3.5 py-2 text-sm text-left text-slate-700 hover:bg-slate-100 flex items-center gap-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 10.5L21 3m-5 5l-7 7m5-5l2-2-2-2-2 2M3 21l3-3m0 0l3-3-3-3-3 3m3 3l3-3" />
          </svg>
          Clear formatting
        </button>
      </div>
  );

  if (bare) return (<>{buttons}{menu}</>);

  return (
    <>
      <div className="flex-shrink-0 sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto flex flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible items-center gap-0.5 px-4 py-1 [&>*]:shrink-0">
          {buttons}
        </div>
      </div>
      {menu}
    </>
  );
}
