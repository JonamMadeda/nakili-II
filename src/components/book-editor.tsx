'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, Search, FileDown, MoreVertical, ChevronLeft, ChevronRight, ChevronDown, X, PanelTopClose, PanelTopOpen, ArrowLeft } from 'lucide-react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { EditorToolbar } from '@/components/editor-toolbar';
import { Editor } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { exportBookPdf, exportPagePdf } from '@/lib/export-pdf';
import { useLoading } from '@/components/global-loader';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

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
  const [openPageList, setOpenPageList] = useState(false);
  const [showPageSearch, setShowPageSearch] = useState(false);
  const [pendingDeletePage, setPendingDeletePage] = useState<Page | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement>(null);
  const pageListRef = useRef<HTMLDivElement>(null);
  const [wordLimitWarning, setWordLimitWarning] = useState<string | null>(null);
  const [pageLimitWarning, setPageLimitWarning] = useState<boolean>(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pagesRef = useRef(pages);
  const bookRef = useRef(book);
  pagesRef.current = pages;
  bookRef.current = book;
  const { withLoading } = useLoading();

  useEffect(() => {
    if (openMenuPageId) {
      const handler = (e: MouseEvent) => {
        if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) {
          setOpenMenuPageId(null);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpenMenuPageId(null);
      };
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', handler);
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [openMenuPageId]);

  useEffect(() => {
    if (openPageList) {
      const handler = (e: MouseEvent) => {
        if (pageListRef.current && !pageListRef.current.contains(e.target as Node)) {
          setOpenPageList(false);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpenPageList(false);
      };
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', handler);
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [openPageList]);

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

    setSaveStatus('saving');
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
      if (res.ok) {
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        onSave?.();
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving book:', error);
      setSaveStatus('error');
    }
  }, [bookId, onSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem('nakilii-focus-mode') === '1') {
        setFocusMode(true);
      }
    } catch {
      // storage unavailable — stay in normal mode
    }
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      try {
        window.localStorage.setItem('nakilii-focus-mode', prev ? '0' : '1');
      } catch {
        // ignore storage failures
      }
      return !prev;
    });
  }, []);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveBook, 500);
  }, [saveBook]);

  const handleTitleChange = (newTitle: string) => {
    setBook((prev) => (prev ? { ...prev, title: newTitle } : null));
    setSaveStatus('dirty');
    debouncedSave();
  };

  const handlePageTitleChange = (pageId: string, newTitle: string) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId ? { ...page, title: newTitle } : page
      )
    );
    setSaveStatus('dirty');
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
    setSaveStatus('dirty');
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
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
      }
    } catch (error) {
      console.error('Error adding page:', error);
    }
  };

  const confirmDeletePage = async () => {
    if (!pendingDeletePage || pages.length <= 1) {
      setPendingDeletePage(null);
      return;
    }
    try {
      await withLoading(fetch(`/api/books/${bookId}/pages/${pendingDeletePage.id}`, {
        method: 'DELETE',
      }), 'Deleting page...');
      setPages((prev) => prev.filter((page) => page.id !== pendingDeletePage.id));
    } catch (error) {
      console.error('Error deleting page:', error);
    } finally {
      setPendingDeletePage(null);
    }
  };

  const handleExportPDF = async () => {
    if (!book || pages.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      exportBookPdf(book.title, pages);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSinglePagePDF = async (page: Page) => {
    if (!book || isExporting) return;
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      exportPagePdf(book.title, page);
    } finally {
      setIsExporting(false);
      setOpenMenuPageId(null);
    }
  };

  const filteredPages = pages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPageSearching = searchQuery.trim().length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const safeActiveIndex = Math.min(activePageIndex, Math.max(0, filteredPages.length - 1));
  const activePage = filteredPages[safeActiveIndex];

  const activeWordCount = useMemo(() => {
    if (!activePage) return 0;
    if (typeof document === 'undefined') return 0;
    return countWords(activePage.content);
  }, [activePage]);

  const nearWordLimit = activeWordCount >= MAX_WORDS_PER_PAGE * 0.9;
  const atWordLimit = activeWordCount >= MAX_WORDS_PER_PAGE;

  const goToPrevPage = () => {
    if (safeActiveIndex > 0) setActivePageIndex(safeActiveIndex - 1);
  };

  const goToNextPage = () => {
    if (safeActiveIndex < filteredPages.length - 1) setActivePageIndex(safeActiveIndex + 1);
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
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchBook}
          className="px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Book not found
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {(wordLimitWarning || pageLimitWarning) && (
        <div
          role="alert"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl"
        >
          <div className="bg-amber-50 border border-amber-200 text-amber-700 pl-3 pr-2 py-2 rounded-lg shadow-lg text-sm flex items-start gap-2">
            <span className="flex-1">
              {pageLimitWarning && `Book has reached maximum of ${MAX_PAGES_PER_BOOK} pages. `}
              {wordLimitWarning}
            </span>
            <button
              type="button"
              aria-label="Dismiss warning"
              onClick={() => { setWordLimitWarning(null); setPageLimitWarning(false); }}
              className="p-1 rounded-md hover:bg-amber-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {!focusMode && (
      <div className="flex-shrink-0 sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-1.5">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex min-w-0 flex-1 basis-44 items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                title="Back to documents"
                className="flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Library</span>
              </button>
            )}
            <div className="h-5 w-px flex-shrink-0 bg-slate-200" aria-hidden="true" />
            <input
              type="text"
              value={book.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 min-w-0 text-[13px] font-medium text-slate-600 bg-transparent border-none rounded placeholder:text-slate-400 truncate focus-visible:outline-2 focus-visible:outline-brand-600"
              placeholder="Book title"
              aria-label="Book title"
            />
            </div>
            <div className="hidden h-5 w-px bg-slate-200 md:block" aria-hidden="true" />
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 md:pl-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
              <EditorToolbar editor={activeEditor} bare />
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPageSearch((v) => !v)}
                aria-label="Search pages in this book"
                aria-expanded={showPageSearch}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                title="Search pages"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={handleAddPage}
                aria-label="New page"
                className="flex items-center gap-1 px-2 py-1 text-[13px] text-primary hover:bg-primary/10 rounded-md transition-colors"
                title="Add page"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden lg:inline">New Page</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                aria-label="Export book as PDF"
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Export PDF"
              >
                {isExporting ? (
                  <span className="block w-4 h-4 border-2 border-slate-300 border-t-brand-700 rounded-full animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        {showPageSearch && (
          <div className="px-4 pb-2">
            <div className="max-w-3xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                autoFocus
                placeholder="Search pages..."
                aria-label="Search pages in this book"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>
      )}

      <div className="flex-shrink-0 z-10 bg-slate-50 border-b border-slate-200">
        {filteredPages.length > 0 && activePage && (
          <div className="px-4 py-1">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={safeActiveIndex === 0}
                aria-label="Previous page"
                className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent flex-shrink-0"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="relative flex-shrink-0" ref={pageListRef}>
                <button
                  type="button"
                  aria-label="Jump to page"
                  aria-haspopup="listbox"
                  aria-expanded={openPageList}
                  onClick={() => setOpenPageList((v) => !v)}
                  className="flex items-center gap-0.5 text-[13px] text-slate-600 hover:text-slate-900 hover:bg-slate-200 whitespace-nowrap tabular-nums rounded-md px-1 py-0.5 transition-colors"
                >
                  {safeActiveIndex + 1} / {filteredPages.length}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openPageList && (
                  <div
                    role="listbox"
                    aria-label="Pages"
                    className="absolute left-0 top-8 z-50 min-w-[220px] max-w-[300px] max-h-64 overflow-y-auto bg-white rounded-lg shadow-lg border border-slate-200 py-1"
                  >
                    {filteredPages.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={i === safeActiveIndex}
                        onClick={() => { setActivePageIndex(i); setOpenPageList(false); }}
                        className={cn(
                          'w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors',
                          i === safeActiveIndex
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )}
                      >
                        <span className="text-[11px] text-slate-400 tabular-nums w-6 flex-shrink-0">{i + 1}</span>
                        <span className="truncate">{p.title || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={goToNextPage}
                disabled={safeActiveIndex === filteredPages.length - 1}
                aria-label="Next page"
                className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent flex-shrink-0"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1 flex-shrink-0" />
              <input
                type="text"
                value={activePage.title}
                onChange={(e) => handlePageTitleChange(activePage.id, e.target.value)}
                className="flex-1 min-w-0 text-sm font-semibold text-slate-900 bg-transparent border-none rounded placeholder:text-slate-500 truncate focus-visible:outline-2 focus-visible:outline-brand-600"
                placeholder="Page title"
                aria-label="Page title"
              />
              <div className="relative flex-shrink-0" ref={pageMenuRef}>
                <button
                  type="button"
                  aria-label={`Options for ${activePage.title}`}
                  aria-haspopup="menu"
                  aria-expanded={openMenuPageId === activePage.id}
                  onClick={() => setOpenMenuPageId(openMenuPageId === activePage.id ? null : activePage.id)}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenuPageId === activePage.id && (
                  <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[140px]">
                    <button
                      onClick={() => { setOpenMenuPageId(null); handleExportSinglePagePDF(activePage); }}
                      className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Export PDF
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={() => { setOpenMenuPageId(null); setPendingDeletePage(activePage); }}
                        className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete page
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={toggleFocusMode}
                aria-pressed={focusMode}
                title={focusMode ? 'Exit focus mode — show the header and toolbar' : 'Focus mode — hide the header and toolbar for distraction-free writing'}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-colors flex-shrink-0',
                  focusMode
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                )}
              >
                {focusMode ? <PanelTopOpen className="w-4 h-4" /> : <PanelTopClose className="w-4 h-4" />}
                <span>{focusMode ? 'Exit focus' : 'Focus'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full px-4 py-4 sm:px-6 sm:py-6">
          <div className="max-w-3xl mx-auto h-full">
            {filteredPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
                <p className="text-lg font-medium">
                  {isPageSearching ? 'No matching pages' : 'No pages yet'}
                </p>
                <p className="text-sm mt-1 mb-4">
                  {isPageSearching
                    ? `Nothing matches "${searchQuery.trim()}"`
                    : 'Create a new page to get started'}
                </p>
                {isPageSearching ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Clear search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddPage}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New page</span>
                  </button>
                )}
              </div>
            ) : activePage ? (
              <div className="h-full bg-white shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <RichTextEditor
                  pageId={activePage.id}
                  content={activePage.content}
                  onChange={(content) => handlePageContentChange(activePage.id, content)}
                  placeholder="Start writing..."
                  className="flex-1 min-h-0"
                  showToolbar={false}
                  onEditorReady={setActiveEditor}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
                <p className="mb-4">Page not found</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setActivePageIndex(0); }}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Back to first page
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 z-10 bg-white border-t border-slate-200">
        <div className="px-4 h-7 flex items-center gap-3 text-[11px] text-slate-500">
          <span aria-live="polite" className="flex items-center gap-1.5 whitespace-nowrap">
            {saveStatus === 'dirty' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="hidden sm:inline">Unsaved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <span className="w-3 h-3 border-2 border-slate-300 border-t-brand-700 rounded-full animate-spin" />
                <span className="hidden sm:inline">Saving…</span>
              </>
            )}
            {saveStatus === 'saved' && lastSavedAt && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">
                  Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </>
            )}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={saveBook}
                className="text-red-600 hover:text-red-700 hover:underline font-medium"
              >
                Save failed · Retry
              </button>
            )}
          </span>
          {activePage && (
            <>
              <span className="w-px h-3 bg-slate-200" aria-hidden="true" />
              <span
                title={`${activeWordCount} of ${MAX_WORDS_PER_PAGE} words · ${formatDate(activePage.date)}`}
                aria-label={`${activeWordCount} of ${MAX_WORDS_PER_PAGE} words, edited ${formatDate(activePage.date)}`}
                className="whitespace-nowrap tabular-nums hidden min-[420px]:inline"
              >
                <span className={cn(
                  atWordLimit
                    ? 'text-red-600 font-semibold'
                    : nearWordLimit
                      ? 'text-amber-600 font-medium'
                      : undefined
                )}>
                  {activeWordCount}/{MAX_WORDS_PER_PAGE}
                </span>
                {' · '}{formatDate(activePage.date)}
              </span>
            </>
          )}
          <span className="flex-1" />
          {filteredPages.length > 0 && (
            <span className="whitespace-nowrap tabular-nums">
              Page {safeActiveIndex + 1} of {filteredPages.length}
            </span>
          )}
        </div>
      </div>

      <Modal
        isOpen={pendingDeletePage !== null}
        onClose={() => setPendingDeletePage(null)}
        title="Delete page"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDeletePage(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeletePage}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <strong className="text-slate-900">“{pendingDeletePage?.title || 'Untitled'}”</strong>?
          This permanently removes the page and its content. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
