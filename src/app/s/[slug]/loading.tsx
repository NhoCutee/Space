export default function SpaceLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
      {/* Masthead Skeleton */}
      <div className="rounded-3xl border border-border/80 bg-card overflow-hidden mb-8">
        <div className="h-64 sm:h-80 bg-secondary" />
        <div className="px-6 py-6 sm:px-8 space-y-4">
          <div className="h-8 w-64 bg-secondary rounded-xl" />
          <div className="h-4 w-full max-w-xl bg-secondary/70 rounded" />
          <div className="flex gap-4 pt-2">
            <div className="h-5 w-24 bg-secondary rounded-full" />
            <div className="h-5 w-24 bg-secondary rounded-full" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden h-64">
            <div className="h-44 bg-secondary" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-32 bg-secondary rounded" />
              <div className="h-3 w-20 bg-secondary/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
