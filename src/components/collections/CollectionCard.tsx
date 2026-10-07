'use client';

import Link from 'next/link';
import { Lock, Globe, Layers } from 'lucide-react';
import { CollectionSummary } from '@/actions/collections';
import { UserIdentity } from '@/components/user';

interface CollectionCardProps {
  collection: CollectionSummary;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const images = collection.previewImages || [];

  return (
    <div className="group block rounded-3xl overflow-hidden border border-zinc-200/90 dark:border-border/80 bg-white dark:bg-card hover:border-zinc-400 dark:hover:border-foreground/30 transition-all duration-300 shadow-xs hover:shadow-lg flex flex-col justify-between">
      <Link
        href={`/c/${collection.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      >
        {/* Visual Collage Preview (4 grid or fallback) */}
        <div className="relative aspect-4/3 w-full bg-zinc-100 dark:bg-muted overflow-hidden">
          {images.length >= 4 ? (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
              {images.slice(0, 4).map((url, i) => (
                <div key={i} className="w-full h-full overflow-hidden">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>
              ))}
            </div>
          ) : images.length > 0 ? (
            <img
              src={images[0]}
              alt={collection.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 dark:text-muted-foreground gap-2">
              <Layers className="w-8 h-8 opacity-40" />
              <span className="text-[11px] font-medium">Bộ sưu tập trống</span>
            </div>
          )}

          {/* Privacy Pill Overlay */}
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-background/90 backdrop-blur-md text-zinc-900 dark:text-foreground border border-zinc-200/80 dark:border-border/60 shadow-xs">
              {collection.isPrivate ? (
                <>
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>Riêng tư</span>
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3 text-emerald-500" />
                  <span>Công khai</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Card Info */}
        <div className="p-4 sm:p-5 pb-0 sm:pb-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-zinc-900 dark:text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {collection.title}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-secondary text-zinc-600 dark:text-muted-foreground shrink-0">
              {collection.itemsCount} {collection.itemsCount === 1 ? 'tác phẩm' : 'tác phẩm'}
            </span>
          </div>

          {collection.description && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-muted-foreground line-clamp-2 leading-relaxed">
              {collection.description}
            </p>
          )}
        </div>
      </Link>

      {/* Card Footer with Creator UserIdentity */}
      {collection.user && (
        <div className="p-4 sm:p-5 pt-3">
          <div className="pt-3 border-t border-zinc-100 dark:border-border/50 flex items-center justify-between text-xs text-zinc-500 dark:text-muted-foreground">
            <UserIdentity
              user={collection.user}
              variant="compact"
              size="xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
