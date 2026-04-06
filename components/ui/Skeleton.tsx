export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5 flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-12 rounded-lg" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 rounded ${i === 0 ? 'w-28' : i === 3 ? 'w-16' : 'w-24'}`} />
        </td>
      ))}
    </tr>
  );
}
