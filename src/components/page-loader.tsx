'use client';

import { cn } from '@/lib/utils';

export function PageLoader({
  message = 'Loading…',
  className = 'h-full',
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 bg-slate-50', className)}>
      <span
        className="w-9 h-9 border-[3px] border-brand-200 border-t-brand-700 rounded-full animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-slate-600 flex items-center gap-1">
        {message}
        <span className="flex gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </p>
    </div>
  );
}
