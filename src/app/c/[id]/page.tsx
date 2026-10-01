import { getCollectionById } from '@/actions/collections';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Globe, Layers, User } from 'lucide-react';
import { CollectionDetailActions } from '@/components/collections/CollectionDetailActions';
import { RemoveFromCollectionButton } from '@/components/collections/RemoveFromCollectionButton';
import { DropCard } from '@/components/drops/DropCard';

export const dynamic = 'force-dynamic';

interface CollectionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { id } = await params;
  const collection = await getCollectionById(id);

  if (!collection) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Collections</span>
        </Link>
      </div>

      {/* Collection Masthead */}
      <div className="rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white dark:bg-card p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-secondary text-zinc-700 dark:text-muted-foreground border border-zinc-200/60 dark:border-border/60">
                {collection.isPrivate ? (
                  <>
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>Private Collection</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3 text-emerald-500" />
                    <span>Public Collection</span>
                  </>
                )}
              </span>

              <span className="text-xs font-semibold text-zinc-500 dark:text-muted-foreground">
                {collection.itemsCount} {collection.itemsCount === 1 ? 'saved drop' : 'saved drops'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-foreground">
              {collection.title}
            </h1>

            {collection.description && (
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-muted-foreground max-w-2xl leading-relaxed">
                {collection.description}
              </p>
            )}

            {/* Creator info */}
            <div className="pt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-muted-foreground">
              <img
                src={collection.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
                alt={collection.user.displayName}
                className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-border"
              />
              <span>Curated by <strong className="text-zinc-900 dark:text-foreground">{collection.user.displayName}</strong> (@{collection.user.username})</span>
            </div>
          </div>

          {/* Owner Actions */}
          {collection.isOwner && (
            <CollectionDetailActions
              collectionId={collection.id}
              initialTitle={collection.title}
              initialDescription={collection.description}
              initialIsPrivate={collection.isPrivate}
            />
          )}
        </div>
      </div>

      {/* Drops in this Collection */}
      {collection.drops.length > 0 ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
          {collection.drops.map((drop) => (
            <div key={drop.id} className="relative group/drop">
              <DropCard drop={drop} showSpaceBadge />
              {collection.isOwner && (
                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover/drop:opacity-100 transition-opacity">
                  <RemoveFromCollectionButton
                    collectionId={collection.id}
                    dropId={drop.id}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-border p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-secondary flex items-center justify-center mx-auto text-zinc-500 dark:text-muted-foreground">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-foreground">
            No drops in this collection yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-muted-foreground leading-relaxed">
            Browse Spaces or your Feed and click the Save button on any Drop to curate it here.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 transition-opacity shadow-xs mt-2"
          >
            <span>Explore Spaces</span>
          </Link>
        </div>
      )}
    </div>
  );
}
