'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Compass } from 'lucide-react';

export default function SpaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Space Error:', error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-14 h-14 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-5 text-destructive shadow-sm">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h2 className="text-2xl font-black tracking-tight text-foreground">
        Unable to load Space
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
        We encountered a temporary issue retrieving this community. Please try again or explore other Spaces.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 border border-border/80 transition-colors"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore Spaces</span>
        </Link>
      </div>
    </div>
  );
}
