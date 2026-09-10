'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalLoaderProvider } from '@/components/global-loader';
import { BookLibrary } from '@/components/book-library';
import { PageLoader } from '@/components/page-loader';

export default function HomePage() {
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
    return <PageLoader message="Checking session" className="h-screen" />;
  }

  return (
    <GlobalLoaderProvider>
      <div className="h-screen overflow-y-auto">
        <BookLibrary />
      </div>
    </GlobalLoaderProvider>
  );
}
