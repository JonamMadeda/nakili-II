export default function Loading() {
  return (
    <div className="h-screen bg-slate-50 overflow-hidden flex flex-col" aria-label="Opening document">
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="max-w-3xl mx-auto flex items-center gap-2 animate-pulse">
          <div className="w-9 h-9 bg-slate-100 rounded-md flex-shrink-0" />
          <div className="h-6 flex-1 bg-slate-100 rounded" />
          <div className="w-16 h-4 bg-slate-100 rounded flex-shrink-0" />
        </div>
      </div>
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-1 px-4 py-2 animate-pulse">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-8 h-7 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 py-4 overflow-hidden">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg p-6 space-y-3 animate-pulse">
          <div className="h-4 w-1/3 bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-2/3 bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-1/2 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
}
