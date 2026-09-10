'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GlobalLoaderProvider } from '@/components/global-loader';
import { BookEditor } from '@/components/book-editor';
import { PageLoader } from '@/components/page-loader';

export default function BookPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;

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
    return <PageLoader message="Checking session" className="h-screen" />;
  }

  return (
    <GlobalLoaderProvider>
      <div className="h-screen bg-slate-50 overflow-hidden">
        <BookEditor bookId={bookId} onBack={() => router.push('/')} />
      </div>
    </GlobalLoaderProvider>
  );
}
