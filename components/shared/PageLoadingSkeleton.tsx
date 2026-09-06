import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] space-y-5 animate-fade-in", className)} role="status" aria-live="polite" aria-label="Loading page">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 max-w-[70vw] rounded-xl" />
          <Skeleton className="h-4 w-72 max-w-[85vw] rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-10 w-24 shrink-0 rounded-xl" />)}
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
            <Skeleton className="h-36 w-full rounded-xl sm:h-40" />
            <div className="space-y-3 pt-4"><Skeleton className="h-5 w-3/4 rounded-lg" /><Skeleton className="h-4 w-full rounded-lg" /><div className="flex items-center justify-between"><Skeleton className="h-6 w-20 rounded-lg" /><Skeleton className="h-10 w-20 rounded-xl" /></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
