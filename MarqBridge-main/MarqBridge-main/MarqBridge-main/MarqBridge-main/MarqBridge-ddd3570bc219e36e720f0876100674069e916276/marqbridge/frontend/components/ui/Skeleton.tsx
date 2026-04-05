'use client'
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-terminal-elevated border border-terminal-border rounded-xl p-4 space-y-2.5">
      <Skeleton className="h-2.5 w-24 rounded" />
      <Skeleton className="h-7 w-32 rounded" />
      <Skeleton className="h-2 w-20 rounded" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-terminal-border/40">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <Skeleton className={`h-2.5 rounded ${
            i === 0 ? 'w-20' : i === 1 ? 'w-16' : 'w-12'
          }`} />
        </td>
      ))}
    </tr>
  )
}

export function NewsItemSkeleton() {
  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 space-y-3">
      <div className="flex gap-2 items-center">
        <Skeleton className="h-6 w-8 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-4 w-12 rounded ml-auto" />
      </div>
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-3/4 rounded" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-2 w-28 rounded" />
        <Skeleton className="h-2 w-28 rounded" />
      </div>
    </div>
  )
}
