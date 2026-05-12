'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, ChevronLeft, Settings, MoreVertical, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoading } from '@/components/global-loader';

interface Book {
  id: string;
  title: string;
  lastModified: string;
  createdAt: string;
  pageCount: number;
  preview: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBookId: string | null;
  onSelectBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  onExportBook: (id: string) => void;
  onOpenSettings: () => void;
  onBookCreated: (bookId: string) => void;
}

export function Sidebar({
  isOpen,
  onClose,
  selectedBookId,
  onSelectBook,
  onDeleteBook,
  onExportBook,
  onOpenSettings,
  onBookCreated,
}: SidebarProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { withLoading } = useLoading();

  useEffect(() => {
    if (openMenuId) {
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setOpenMenuId(null);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [openMenuId]);

  const fetchBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/books');
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleCreateBook = async () => {
    try {
      const response = await withLoading(fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }), 'Creating book...');
      if (response.ok) {
        const data = await response.json();
        const newBook = data.book || data.note;
        setBooks(prev => [newBook, ...prev]);
        onBookCreated(newBook.id);
      }
    } catch (error) {
      console.error('Error creating book:', error);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        const response = await withLoading(fetch(`/api/books/${id}`, { method: 'DELETE' }), 'Deleting book...');
        if (response.ok) {
          setBooks(prev => prev.filter(b => b.id !== id));
          onDeleteBook(id);
        } else {
          const data = await response.json();
          console.error('Delete failed:', data);
        }
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
    setOpenMenuId(null);
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-30 w-80 h-screen sidebar flex flex-col transition-transform duration-300 ease-out shadow-2xl shadow-black/30',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-5 border-b sidebar-divider">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-handwriting sidebar-text">
                Nakili
              </h1>
            </div>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-text-muted group-focus-within:text-sidebar-text transition-colors duration-200" />
            <input
              type="text"
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm sidebar-text rounded-xl border border-transparent sidebar-input focus-visible-navy"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 h-0 flex-1 sidebar-scroll">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs sidebar-text-muted">Loading books...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-sidebar-hover)] flex items-center justify-center mb-4 shadow-inner">
                <BookOpen className="w-6 h-6 text-sidebar-text-muted" />
              </div>
              <p className="text-sm sidebar-text font-medium mb-1.5">
                {searchQuery ? 'No results found' : 'No books yet'}
              </p>
              <p className="text-xs sidebar-text-muted text-center leading-relaxed">
                {searchQuery ? 'Try a different search term' : 'Create your first book to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateBook}
                  className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl text-sm sidebar-text hover:bg-[var(--color-sidebar-hover)] transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Book</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={handleCreateBook}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm sidebar-text-muted hover:text-white hover:bg-[var(--color-sidebar-hover)] transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>New Book</span>
              </button>
              <div className="px-2 py-2">
                <p className="text-xs font-medium sidebar-text-muted uppercase tracking-wider">
                  {filteredBooks.length} {filteredBooks.length === 1 ? 'Book' : 'Books'}
                </p>
              </div>
              {[...filteredBooks].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()).map((book) => (
                <div
                  key={book.id}
                  onClick={() => {
                    onSelectBook(book.id);
                    onClose();
                  }}
                  className={cn(
                    'group relative p-3 rounded-xl cursor-pointer transition-all duration-200 sidebar-item',
                    selectedBookId === book.id 
                      ? 'sidebar-item-selected' 
                      : 'border border-transparent hover:border-[var(--color-sidebar-border)]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                      selectedBookId === book.id 
                        ? 'book-icon' 
                        : 'book-icon'
                    )}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={cn(
                          'font-medium truncate text-sm transition-colors duration-200',
                          selectedBookId === book.id ? 'text-white' : 'sidebar-text'
                        )}>
                          {book.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === book.id) {
                              setOpenMenuId(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                              setOpenMenuId(book.id);
                            }
                          }}
                          className="p-1.5 rounded-lg sidebar-text-muted hover:text-white hover:bg-[var(--color-sidebar-hover)] opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <p className={cn(
                        'text-xs line-clamp-1 mt-0.5 transition-colors duration-200',
                        selectedBookId === book.id ? 'text-sidebar-text' : 'sidebar-text-muted'
                      )}>
                        {stripHtml(book.preview) || 'Empty book'}
                      </p>
                      <div className={cn(
                        'flex items-center gap-2 mt-2 text-xs transition-colors duration-200',
                        selectedBookId === book.id ? 'text-sidebar-text' : 'sidebar-text-muted'
                      )}>
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3" />
                          {book.pageCount}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                        <span>{formatDate(book.lastModified)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-settings p-3">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-sidebar-text-muted hover:text-white hover:bg-[var(--color-sidebar-hover)] transition-all duration-200 text-sm font-medium group"
          >
            <Settings className="w-4 h-4 transition-transform duration-200 group-hover:rotate-45" />
            <span>Account</span>
          </button>
        </div>
      </aside>
      {openMenuId && menuPos && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="bg-[var(--color-sidebar-active)] rounded-xl shadow-2xl border border-[var(--color-sidebar-border)] py-1.5 min-w-[150px] overflow-hidden backdrop-blur-sm"
        >
          <button
            onClick={() => {
              onExportBook(openMenuId);
              setOpenMenuId(null);
            }}
            className="w-full px-3.5 py-2.5 text-sm text-left sidebar-text hover:bg-[var(--color-sidebar-hover)] flex items-center gap-3 transition-colors duration-150"
          >
            <svg className="w-4 h-4 text-sidebar-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={() => handleDeleteBook(openMenuId)}
            className="w-full px-3.5 py-2.5 text-sm text-left text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  );
}