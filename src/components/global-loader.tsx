'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
  withLoading: <T>(promise: Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  loadingMessage: '',
  setLoading: () => {},
  withLoading: async (p) => p,
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const setLoading = useCallback((loading: boolean, message?: string) => {
    setIsLoading(loading);
    if (message) setLoadingMessage(message);
  }, []);

  const withLoading = useCallback(async <T,>(promise: Promise<T>, message?: string): Promise<T> => {
    setIsLoading(true);
    if (message) setLoadingMessage(message);
    try {
      return await promise;
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading, withLoading }}>
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/90 shadow-2xl">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            {loadingMessage && (
              <p className="text-sm text-slate-600 font-medium text-center max-w-[200px]">
                {loadingMessage}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}