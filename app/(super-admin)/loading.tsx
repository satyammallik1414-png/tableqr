export default function SuperAdminLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in p-2">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-48 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-10 w-96 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-72 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>

      {/* Top 4 Hero Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/60 p-5 space-y-2"
          >
            <div className="h-8 w-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-4 w-32 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/60 p-6 space-y-4">
          <div className="h-6 w-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-60 w-full rounded-xl bg-gray-50 dark:bg-gray-800/40 animate-pulse" />
        </div>
        <div className="h-80 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/60 p-6 space-y-4">
          <div className="h-6 w-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-60 w-full rounded-xl bg-gray-50 dark:bg-gray-800/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
