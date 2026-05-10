'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { NoteEditor } from '@/components/note-editor';

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      if (!data.user) {
        router.push('/auth');
      } else {
        setIsAuthenticated(true);
      }
    } catch {
      router.push('/auth');
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedBookId={selectedBookId}
        onSelectBook={(id) => setSelectedBookId(id)}
        onDeleteBook={(id) => {
          if (selectedBookId === id) {
            setSelectedBookId(null);
          }
        }}
        onExportBook={(id) => setSelectedBookId(id)}
        onOpenSettings={() => router.push('/settings')}
        onBookCreated={(bookId) => setSelectedBookId(bookId)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 py-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedBookId ? (
            <NoteEditor
              bookId={selectedBookId}
              onBack={() => setSelectedBookId(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-slate-900 mb-1">No book selected</h2>
                <p className="text-sm text-slate-500">
                  Select a book from the sidebar or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
