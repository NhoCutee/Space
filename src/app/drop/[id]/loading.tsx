export default function DropLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-secondary rounded-3xl h-[450px] sm:h-[600px]" />
        <div className="lg:col-span-4 space-y-4">
          <div className="h-6 w-32 bg-secondary rounded-full" />
          <div className="h-8 w-48 bg-secondary rounded-xl" />
          <div className="h-4 w-full bg-secondary/70 rounded" />
          <div className="h-4 w-3/4 bg-secondary/70 rounded" />
          <div className="pt-6 space-y-3">
            <div className="h-10 w-full bg-secondary rounded-xl" />
            <div className="h-10 w-full bg-secondary rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
