'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, BookOpen, MoreVertical, Trash2, X, FileDown, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoading } from '@/components/global-loader';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { exportBookPdf } from '@/lib/export-pdf';

interface Book {
  id: string;
  title: string;
  lastModified: string;
  createdAt: string;
  pageCount: number;
  preview: string;
}

function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, '').trim();
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDate(dateString: string): string {
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) return formatFullDate(dateString);
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) {
    const d = Math.floor(diff / day);
    return d === 1 ? 'Yesterday' : `${d}d ago`;
  }
  return formatFullDate(dateString);
}

function DocumentMenu({
  book,
  open,
  onToggle,
  onOpen,
  onExport,
  onDelete,
  menuRef,
}: {
  book: Book;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onExport: () => void;
  onDelete: () => void;
  menuRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative flex-shrink-0" ref={open ? menuRef : undefined}>
      <button
        type="button"
        aria-label={`Options for ${book.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          'p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors',
          open
            ? 'opacity-100'
            : 'opacity-0 max-sm:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100'
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Document options"
          className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[150px]"
        >
          <button
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="w-full px-3.5 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-100 flex items-center gap-3 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            Open
          </button>
          <button
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="w-full px-3.5 py-2.5 text-sm text-left text-slate-700 hover:bg-slate-100 flex items-center gap-3 transition-colors"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            Export PDF
          </button>
          <button
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-full px-3.5 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function BookLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'recent' | 'az'>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { withLoading } = useLoading();

  useEffect(() => {
    if (openMenuId) {
      const onPointer = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setOpenMenuId(null);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpenMenuId(null);
      };
      document.addEventListener('mousedown', onPointer);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onPointer);
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [openMenuId]);

  const fetchBooks = useCallback(async () => {
    try {
      setFetchError(null);
      const response = await fetch('/api/books');
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || data.notes || []);
      } else {
        setFetchError('Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setFetchError('Failed to load documents. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem('nakilii-library-view');
      if (v === 'grid' || v === 'list') setViewMode(v);
    } catch {
      // storage unavailable — keep list default
    }
  }, []);

  const changeView = useCallback((mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('nakilii-library-view', mode);
    } catch {
      // ignore storage failures
    }
  }, []);

  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? books.filter(
          (book) =>
            book.title.toLowerCase().includes(q) ||
            stripHtml(book.preview).toLowerCase().includes(q)
        )
      : [...books];
    if (sortMode === 'az') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered.sort(
        (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    }
    return filtered;
  }, [books, searchQuery, sortMode]);

  const openBook = useCallback((id: string) => {
    setOpeningId(id);
    router.push(`/books/${id}`);
  }, [router]);

  const prefetchBook = useCallback((id: string) => {
    router.prefetch(`/books/${id}`);
  }, [router]);

  const openingTitle = openingId ? books.find((b) => b.id === openingId)?.title || 'document' : null;

  const handleCreateBook = async () => {
    try {
      setActionError(null);
      const response = await withLoading(fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }), 'Creating document...');
      if (response.ok) {
        const data = await response.json();
        const newBook = data.book || data.note;
        router.push(`/books/${newBook.id}`);
      } else {
        setActionError("Couldn't create the document. Please try again.");
      }
    } catch (error) {
      console.error('Error creating book:', error);
      setActionError("Couldn't create the document. Check your connection and try again.");
    }
  };

  const handleExportBook = async (id: string) => {
    try {
      setActionError(null);
      const response = await withLoading(fetch(`/api/books/${id}`), 'Preparing PDF...');
      if (!response.ok) {
        setActionError("Couldn't export the document. Please try again.");
        return;
      }
      const data = await response.json();
      const pages = (data.pages || []).sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      exportBookPdf(data.title, pages);
    } catch (error) {
      console.error('Error exporting book:', error);
      setActionError('Export failed. Check your connection and try again.');
    }
    setOpenMenuId(null);
  };

  const confirmDeleteBook = async () => {
    if (!pendingDelete) return;
    try {
      setActionError(null);
      const response = await withLoading(fetch(`/api/books/${pendingDelete.id}`, { method: 'DELETE' }), 'Deleting document...');
      if (response.ok) {
        setBooks((prev) => prev.filter((b) => b.id !== pendingDelete.id));
        setPendingDelete(null);
      } else {
        setActionError(`Couldn't delete "${pendingDelete.title}". Please try again.`);
        setPendingDelete(null);
      }
    } catch (error) {
      console.error('Error deleting book:', error);
      setActionError('Delete failed. Check your connection and try again.');
      setPendingDelete(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-700 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-handwriting text-slate-900 flex-1">Nakilii</h1>
          <button
            type="button"
            onClick={() => router.push('/accounts')}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Account
          </button>
        </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4">

        <div className="flex items-baseline gap-2.5 mb-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Documents</h2>
          {!isLoading && !fetchError && books.length > 0 && (
            <span aria-live="polite" className="text-sm text-slate-500">
              {isSearching
                ? `${filteredBooks.length} of ${books.length}`
                : `${books.length} ${books.length === 1 ? 'document' : 'documents'}`}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents..."
              aria-label="Search documents"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-brand-600"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCreateBook}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-600 transition-colors active:scale-[0.98] flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New document</span>
          </button>
        </div>

        {actionError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            <span>{actionError}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setActionError(null)}
              className="p-1 rounded-md hover:bg-red-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <span aria-live="polite" className="sr-only">
          {openingTitle ? `Opening ${openingTitle}…` : ''}
        </span>

        {!isLoading && !fetchError && books.length > 0 && (
          <div className="flex items-center justify-end gap-2 mb-3">
              <div role="group" aria-label="Change view" className="flex gap-0.5 p-0.5 bg-white border border-slate-200 rounded-lg">
                {(['list', 'grid'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={viewMode === mode}
                    aria-label={mode === 'list' ? 'List view' : 'Grid view'}
                    title={mode === 'list' ? 'List view' : 'Grid view'}
                    onClick={() => changeView(mode)}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === mode
                        ? 'bg-brand-700 text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    {mode === 'list' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Sort documents" className="flex gap-0.5 p-0.5 bg-white border border-slate-200 rounded-lg">
                {(['recent', 'az'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={sortMode === mode}
                    onClick={() => setSortMode(mode)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                      sortMode === mode
                        ? 'bg-brand-700 text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    {mode === 'recent' ? 'Recent' : 'A–Z'}
                  </button>
                ))}
              </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading documents">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 w-2/3 bg-slate-100 rounded mb-3" />
                <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
                <div className="h-3 w-1/3 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : fetchError && books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-base font-medium text-slate-900 mb-1">Couldn't load documents</p>
            <p className="text-sm text-slate-500 mb-5">{fetchError}</p>
            <button
              type="button"
              onClick={fetchBooks}
              className="px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-base font-medium text-slate-900 mb-1">
              {isSearching ? 'No results found' : 'No documents yet'}
            </p>
            <p className="text-sm text-slate-500 mb-5">
              {isSearching ? 'Try a different search term' : 'Create your first document to get started'}
            </p>
            {isSearching ? (
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
                onClick={handleCreateBook}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New document</span>
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" role="list" aria-label="Documents">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  role="listitem"
                  aria-busy={openingId === book.id}
                  onClick={() => openBook(book.id)}
                  onMouseEnter={() => prefetchBook(book.id)}
                  onFocus={() => prefetchBook(book.id)}
                  className="group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-100 last:border-b-0 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  {openingId === book.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/70" aria-hidden="true">
                      <span className="w-4 h-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-slate-700">Opening…</span>
                    </div>
                  )}
                  <button
                    type="button"
                    title={book.title || 'Untitled'}
                    onClick={() => openBook(book.id)}
                    className="font-semibold text-sm text-slate-900 truncate text-left flex-1 min-w-0 md:flex-none md:max-w-[36%] rounded focus-visible:outline-2 focus-visible:outline-brand-600"
                  >
                    {book.title || 'Untitled'}
                  </button>
                  <span className="hidden md:block flex-1 min-w-0 truncate text-xs text-slate-500">
                    {stripHtml(book.preview) || 'No content yet'}
                  </span>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap tabular-nums flex-shrink-0">
                    {book.pageCount} {book.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                    <span title={formatFullDate(book.lastModified)}>
                      {formatRelativeDate(book.lastModified)}
                    </span>
                  </span>
                  <DocumentMenu
                    book={book}
                    open={openMenuId === book.id}
                    menuRef={menuRef}
                    onToggle={() => setOpenMenuId(openMenuId === book.id ? null : book.id)}
                    onOpen={() => { setOpenMenuId(null); openBook(book.id); }}
                    onExport={() => handleExportBook(book.id)}
                    onDelete={() => { setOpenMenuId(null); setPendingDelete(book); }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Documents">
              {filteredBooks.map((book) => (
                <article
                  key={book.id}
                  role="listitem"
                  aria-busy={openingId === book.id}
                  onClick={() => openBook(book.id)}
                  onMouseEnter={() => prefetchBook(book.id)}
                  onFocus={() => prefetchBook(book.id)}
                  className="group relative bg-white border border-slate-200 rounded-xl p-4 cursor-pointer transition-all duration-150 hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  {openingId === book.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/70 rounded-xl" aria-hidden="true">
                      <span className="w-4 h-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-slate-700">Opening…</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <button
                      type="button"
                      title={book.title || 'Untitled'}
                      onClick={() => openBook(book.id)}
                      className="font-semibold text-[15px] text-slate-900 truncate text-left flex-1 rounded focus-visible:outline-2 focus-visible:outline-brand-600"
                    >
                      {book.title || 'Untitled'}
                    </button>
                    <DocumentMenu
                      book={book}
                      open={openMenuId === book.id}
                      menuRef={menuRef}
                      onToggle={() => setOpenMenuId(openMenuId === book.id ? null : book.id)}
                      onOpen={() => { setOpenMenuId(null); openBook(book.id); }}
                      onExport={() => handleExportBook(book.id)}
                      onDelete={() => { setOpenMenuId(null); setPendingDelete(book); }}
                    />
                  </div>
                  <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2 mb-3 min-h-[2.5rem]">
                    {stripHtml(book.preview) || 'No content yet'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {book.pageCount} {book.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                    <span title={formatFullDate(book.lastModified)}>
                      {formatRelativeDate(book.lastModified)}
                    </span>
                  </p>
                </article>
              ))}
            </div>
        )}
      </div>

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteBook}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <strong className="text-slate-900">“{pendingDelete?.title || 'Untitled'}”</strong>? This
          permanently removes the document and its{' '}
          {pendingDelete?.pageCount} {pendingDelete?.pageCount === 1 ? 'page' : 'pages'}. This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
