'use client';

export function ThreadListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="h-full overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-border-subtle px-4 py-3 animate-pulse">
          <div className="mt-2 h-2 w-2 rounded-full bg-bg-tertiary flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-bg-tertiary" />
              <div className="h-3 w-12 rounded bg-bg-tertiary" />
            </div>
            <div className="h-3.5 w-3/4 rounded bg-bg-tertiary" />
            <div className="h-3 w-1/2 rounded bg-bg-tertiary" />
          </div>
        </div>
      ))}
    </div>
  );
}
