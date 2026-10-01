import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';

export default function GlobalNotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-14 h-14 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-5 text-muted-foreground shadow-sm">
        <Compass className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-foreground">
        Page Not Found
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
        The route you requested does not exist in Spaces.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
