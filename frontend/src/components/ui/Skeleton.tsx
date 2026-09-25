import clsx from 'clsx';

// Esqueleto instantâneo — nunca um spinner de rede (§15). Some assim que
// a hidratação local termina, que é rapidíssima por ser local.
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)]', className)} />;
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
