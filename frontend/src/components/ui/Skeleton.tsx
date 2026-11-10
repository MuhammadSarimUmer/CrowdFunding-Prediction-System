import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-high', className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-card border border-line/40 bg-card p-6 shadow-paper" aria-hidden="true">
      <Skeleton className="mb-4 h-40 w-full rounded-xl" />
      <Skeleton className="mb-3 h-5 w-3/4" />
      <SkeletonText lines={2} />
      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20 rounded-pill" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-line/40 bg-card shadow-paper" aria-hidden="true">
      <div className="flex gap-4 border-b border-line/40 bg-surface-low px-5 py-4">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/6" />
        <Skeleton className="h-3 w-1/6" />
        <Skeleton className="h-3 w-1/6" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-line/20 px-5 py-4 last:border-0">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-6 w-20 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-line/40 bg-card p-5 shadow-paper">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="mb-2 h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
