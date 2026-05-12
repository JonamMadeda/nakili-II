'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Search, FileDown, MoreVertical } from 'lucide-react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import { useLoading } from '@/components/global-loader';

interface Page {
  id: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
}

interface BookEditorProps {
  bookId: string;
  onBack?: () => void;
  onSave?: () => void;
}

export function BookEditor({ bookId, onBack, onSave }: BookEditorProps) {
  const [book, setBook] = useState<{ id: string; title: string } | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuPageId, setOpenMenuPageId] = useState<string | null>(null);
  const [wordLimitWarning, setWordLimitWarning] = useState<string | null>(null);
  const [pageLimitWarning, setPageLimitWarning] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pagesRef = useRef(pages);
  const bookRef = useRef(book);
  pagesRef.current = pages;
  bookRef.current = book;
  const { withLoading } = useLoading();

  useEffect(() => {
    if (openMenuPageId) {
      const handler = () => setOpenMenuPageId(null);
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [openMenuPageId]);

  const MAX_WORDS_PER_PAGE = 3000;
  const MAX_PAGES_PER_BOOK = 100;

  const countWords = (html: string): number => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || '';
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  useEffect(() => {
    if (bookId) {
      fetchBook();
    }
  }, [bookId]);

  const fetchBook = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/books/${bookId}`);
      const data = await response.json();

      if (response.ok) {
        setBook({ id: data.id, title: data.title });
        const sorted = (data.pages || []).sort(
          (a: Page, b: Page) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPages(sorted);
      } else {
        setError(data.error || 'Failed to load book');
      }
    } catch (error) {
      setError('Failed to load book');
    } finally {
      setIsLoading(false);
    }
  };

  const saveBook = useCallback(async () => {
    const currentPages = pagesRef.current;
    const currentBook = bookRef.current;
    if (!bookId || !currentPages) return;

    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentBook?.title,
          pages: currentPages.map((p) => ({
            id: p.id,
            title: p.title,
            content: p.content,
          })),
        }),
      });
      if (res.ok) onSave?.();
    } catch (error) {
      console.error('Error saving book:', error);
    }
  }, [bookId, onSave]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveBook, 500);
  }, [saveBook]);

  const handleTitleChange = (newTitle: string) => {
    setBook((prev) => (prev ? { ...prev, title: newTitle } : null));
    debouncedSave();
  };

  const handlePageTitleChange = (pageId: string, newTitle: string) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId ? { ...page, title: newTitle } : page
      )
    );
    debouncedSave();
  };

  const handlePageContentChange = (pageId: string, newContent: string) => {
    const wordCount = countWords(newContent);
    if (wordCount > MAX_WORDS_PER_PAGE) {
      if (!wordLimitWarning) {
        setWordLimitWarning(`Page "${pages.find(p => p.id === pageId)?.title}" has reached the ${MAX_WORDS_PER_PAGE} word limit`);
        setTimeout(() => setWordLimitWarning(null), 5000);
      }
      return;
    }
    setWordLimitWarning(null);
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId ? { ...page, content: newContent } : page
      )
    );
    debouncedSave();
  };

  const handleAddPage = async () => {
    if (!bookId) return;

    if (pages.length >= MAX_PAGES_PER_BOOK) {
      setPageLimitWarning(true);
      setTimeout(() => setPageLimitWarning(false), 5000);
      return;
    }

    try {
      const response = await withLoading(fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: [...pages.map((p) => ({ id: p.id, title: p.title, content: p.content })), { title: `Page ${pages.length + 1}`, content: '' }],
        }),
      }), 'Adding page...');
      if (response.ok) {
        await fetchBook();
      }
    } catch (error) {
      console.error('Error adding page:', error);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (pages.length <= 1) return;

    if (confirm('Are you sure you want to delete this page?')) {
      try {
        await withLoading(fetch(`/api/books/${bookId}/pages/${pageId}`, {
          method: 'DELETE',
        }), 'Deleting page...');
        setPages((prev) => prev.filter((page) => page.id !== pageId));
      } catch (error) {
        console.error('Error deleting page:', error);
      }
    }
  };

  const handleExportPDF = () => {
    if (!book || pages.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yOffset = 20;

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(book.title, pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128);
    doc.text(`Exported on ${new Date().toLocaleDateString()}`, pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 15;

    pages.forEach((page, index) => {
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(page.title, 20, yOffset);
      yOffset += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128);
      doc.text(`Page ${index + 1} - ${new Date(page.date).toLocaleDateString()}`, 20, yOffset);
      yOffset += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);

      yOffset = renderHtmlContent(doc, page.content, 20, yOffset, pageWidth - 40);

      yOffset += 10;
    });

    const filename = `${book.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  lineBreak?: boolean;
}

function collectInlineRuns(node: Node, bold = false, italic = false, strike = false, underline = false): TextRun[] {
  const runs: TextRun[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (text) {
      runs.push({ text, bold, italic, strike, underline });
    }
    return runs;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      return [{ text: '', bold, italic, strike, underline, lineBreak: true }];
    }
    if (tag === 'strong' || tag === 'b' || tag === 'th') bold = true;
    if (tag === 'em' || tag === 'i') italic = true;
    if (tag === 's' || tag === 'strike' || tag === 'del') strike = true;
    if (tag === 'u') underline = true;
    if (el.style.fontWeight === 'bold' || el.style.fontWeight === '700') bold = true;
    if (el.style.fontStyle === 'italic') italic = true;
    if (el.style.textDecoration?.includes('underline')) underline = true;
    if (el.style.textDecoration?.includes('line-through')) strike = true;

    for (const child of el.childNodes) {
      runs.push(...collectInlineRuns(child, bold, italic, strike, underline));
    }
  }

  return runs;
}

interface WordRun {
  text: string;
  w: number;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  lineBreak?: boolean;
}

function renderInlineRuns(
  doc: jsPDF,
  runs: TextRun[],
  x: number,
  startY: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): number {
  let y = startY;

  function flushLine(lineWords: WordRun[]) {
    if (lineWords.length === 0) return;
    if (y > 265) { doc.addPage(); y = 20; }
    let cx = x;
    for (const lw of lineWords) {
      const fs = lw.bold && lw.italic ? 'bolditalic' : lw.bold ? 'bold' : lw.italic ? 'italic' : 'normal';
      doc.setFont('helvetica', fs);
      doc.setFontSize(fontSize);
      doc.text(lw.text, cx, y);
      if (lw.underline) {
        doc.setLineWidth(0.3);
        doc.line(cx, y + 1, cx + lw.w, y + 1);
      }
      if (lw.strike) {
        doc.setLineWidth(0.3);
        doc.line(cx, y - fontSize * 0.3, cx + lw.w, y - fontSize * 0.3);
      }
      cx += lw.w;
    }
    y += lineHeight;
  }

  let lineWords: WordRun[] = [];
  let lineWidth = 0;

  for (const run of runs) {
    if (run.lineBreak) {
      flushLine(lineWords);
      lineWords = [];
      lineWidth = 0;
      continue;
    }

    const words = run.text.match(/\S+\s*/g) || [];
    for (const word of words) {
      const fs = run.bold && run.italic ? 'bolditalic' : run.bold ? 'bold' : run.italic ? 'italic' : 'normal';
      doc.setFont('helvetica', fs);
      doc.setFontSize(fontSize);
      const w = doc.getTextWidth(word);

      if (lineWidth + w > maxWidth && lineWidth > 0) {
        flushLine(lineWords);
        lineWords = [];
        lineWidth = 0;
      }

      lineWords.push({ text: word, w, bold: run.bold, italic: run.italic, strike: run.strike, underline: run.underline });
      lineWidth += w;
    }
  }

  flushLine(lineWords);

  return y;
}

  const renderHtmlContent = (doc: jsPDF, html: string, x: number, startY: number, maxWidth: number): number => {
    let y = startY;
    const parser = new DOMParser();
    const doc2 = parser.parseFromString(html, 'text/html');
    const body = doc2.body;

    function checkPage() {
      if (y > 265) { doc.addPage(); y = 20; }
    }

    for (const child of Array.from(body.children)) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag.startsWith('h')) {
        const level = parseInt(tag[1]) || 1;
        const fontSize = Math.max(22 - level * 4, 14);
        checkPage();
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        y += 2;
        y = renderInlineRuns(doc, collectInlineRuns(el), x, y, maxWidth, fontSize, fontSize * 0.35 + 6);
        y += 6;
      } else if (tag === 'ul' || tag === 'ol') {
        const isOrdered = tag === 'ol';
        let idx = 0;
        for (const li of Array.from(el.children)) {
          if (li.tagName.toLowerCase() !== 'li') continue;
          idx++;
          checkPage();
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0);
          const runs = collectInlineRuns(li);
          const prefix = isOrdered ? `${idx}. ` : '• ';
          y = renderInlineRuns(doc, [{ text: prefix, bold: false, italic: false, strike: false, underline: false }, ...runs], x, y, maxWidth - 10, 11, 5.5);
          y += 1;
        }
        y += 4;
      } else if (tag === 'blockquote') {
        checkPage();
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        y += 1;
        y = renderInlineRuns(doc, collectInlineRuns(el), x + 10, y, maxWidth - 20, 11, 5.5);
        doc.setTextColor(0);
        y += 5;
      } else if (tag === 'pre') {
        checkPage();
        doc.setFontSize(9);
        doc.setFont('courier', 'normal');
        doc.setTextColor(0);
        const text = el.textContent?.trim();
        if (text) {
          const split = doc.splitTextToSize(text, maxWidth - 10);
          split.forEach((line: string) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(line, x + 5, y);
            y += 4.5;
          });
        }
        y += 4;
      } else {
        if (!el.textContent?.trim()) continue;
        checkPage();
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        y = renderInlineRuns(doc, collectInlineRuns(el), x, y, maxWidth, 11, 5.5);
        y += 6;
      }
    }

    return y;
  };

  const handleExportSinglePagePDF = (page: Page) => {
    if (!book) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yOffset = 20;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(page.title, 20, yOffset);
    yOffset += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128);
    doc.text(`${new Date(page.date).toLocaleDateString()}`, 20, yOffset);
    yOffset += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    yOffset = renderHtmlContent(doc, page.content, 20, yOffset, pageWidth - 40);

    const filename = `${book.title.replace(/[^a-zA-Z0-9]/g, '-')}-${page.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    doc.save(filename);
    setOpenMenuPageId(null);
  };

  const filteredPages = pages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Book not found
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4">
        {(wordLimitWarning || pageLimitWarning) && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-md text-sm">
              {pageLimitWarning && `Book has reached maximum of ${MAX_PAGES_PER_BOOK} pages. `}
              {wordLimitWarning}
            </div>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-700 lg:hidden flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <input
            type="text"
            value={book.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 min-w-0 text-xl sm:text-2xl font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-400 truncate"
            placeholder="Book title"
          />
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-primary w-36"
              />
            </div>
            <span className="text-sm text-slate-500 whitespace-nowrap hidden lg:block">
              {pages.length} pages
            </span>
            <button
              onClick={handleAddPage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
              title="Add page"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">New Page</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              title="Export PDF"
            >
              <FileDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto pb-8 flex flex-col gap-6">
          {filteredPages.map((page, index) => (
            <div
              key={page.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col max-h-[650px]"
            >
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">
                    Page {index + 1}
                  </span>
                  <input
                    type="text"
                    value={page.title}
                    onChange={(e) => handlePageTitleChange(page.id, e.target.value)}
                    className="text-sm font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0"
                    placeholder="Page title"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {formatDate(page.date)}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuPageId(openMenuPageId === page.id ? null : page.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuPageId === page.id && (
                      <div className="absolute right-0 top-8 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 min-w-[140px]">
                        <button
                          onClick={() => { setOpenMenuPageId(null); handleExportSinglePagePDF(page); }}
                          className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Export PDF
                        </button>
                        {pages.length > 1 && (
                          <button
                            onClick={() => { setOpenMenuPageId(null); handleDeletePage(page.id); }}
                            className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete page
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <RichTextEditor
                content={page.content}
                onChange={(content) => handlePageContentChange(page.id, content)}
                placeholder="Start writing..."
                className="flex-1 min-h-0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
