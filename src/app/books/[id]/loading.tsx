export default function Loading() {
  return (
    <div className="h-screen bg-slate-50 overflow-hidden flex flex-col" aria-label="Opening document">
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 py-1.5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 animate-pulse">
          <div className="flex min-w-0 flex-1 basis-44 items-center gap-3">
            <div className="w-20 h-7 bg-slate-100 rounded-md flex-shrink-0" />
            <div className="h-4 flex-1 bg-slate-100 rounded" />
          </div>
          <div className="hidden h-5 w-px bg-slate-200 md:block" aria-hidden="true" />
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="w-7 h-7 bg-slate-100 rounded-md flex-shrink-0" />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-16 h-7 bg-slate-100 rounded-md" />
            <div className="w-7 h-7 bg-slate-100 rounded-md" />
          </div>
        </div>
      </div>
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-1">
        <div className="max-w-3xl mx-auto flex items-center gap-2 animate-pulse">
          <div className="w-6 h-6 bg-slate-200/70 rounded-md" />
          <div className="w-14 h-4 bg-slate-200/70 rounded" />
          <div className="w-6 h-6 bg-slate-200/70 rounded-md" />
          <div className="h-4 flex-1 bg-slate-200/70 rounded" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto h-full bg-white border border-slate-200 p-6 space-y-3 animate-pulse">
          <div className="h-5 w-1/3 bg-brand-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-11/12 bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-4/5 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 rounded-full bg-brand-700 pl-3 pr-4 py-2.5 shadow-lg">
        <span className="w-4 h-4 border-2 border-brand-200 border-t-white rounded-full animate-spin" aria-hidden="true" />
        <span className="text-sm font-medium text-white whitespace-nowrap">
          Opening document
          <span className="inline-flex gap-0.5 ml-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-white/80 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}
