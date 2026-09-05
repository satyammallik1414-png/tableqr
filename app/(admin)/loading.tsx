export default function AdminLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in p-2">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-4 w-72 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/60 p-4 space-y-3"
          >
            <div className="h-7 w-7 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-6 w-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-3 w-28 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/60 p-6 space-y-4">
          <div className="h-5 w-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-48 w-full rounded-xl bg-gray-50 dark:bg-gray-800/40 animate-pulse" />
        </div>
        <div className="h-72 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/60 p-6 space-y-4">
          <div className="h-5 w-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-48 w-full rounded-xl bg-gray-50 dark:bg-gray-800/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
