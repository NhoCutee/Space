export default function ExploreLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      <div className="max-w-xl mb-8 space-y-3">
        <div className="h-5 w-28 bg-secondary rounded-full" />
        <div className="h-10 w-64 bg-secondary rounded-2xl" />
        <div className="h-4 w-96 bg-secondary/60 rounded" />
      </div>

      <div className="h-11 w-full max-w-xl bg-secondary rounded-2xl mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-card overflow-hidden h-80 flex flex-col justify-between"
          >
            <div className="h-44 bg-secondary" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-36 bg-secondary rounded" />
              <div className="h-3 w-48 bg-secondary/60 rounded" />
              <div className="pt-2 flex justify-between">
                <div className="h-4 w-20 bg-secondary rounded" />
                <div className="h-6 w-16 bg-secondary rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
