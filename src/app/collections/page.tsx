import { getUserCollections } from '@/actions/collections';
import { getCurrentUser } from '@/lib/auth';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { CollectionsPageClient } from './CollectionsPageClient';
import { Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  const collections = await getUserCollections(user?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header and Create Button handled in Client Container */}
      <CollectionsPageClient
        user={user ? { id: user.id, username: user.username, displayName: user.displayName } : null}
      />

      {/* Grid of collections */}
      {collections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {collections.map((col) => (
            <CollectionCard key={col.id} collection={col} />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-3xl border border-dashed border-zinc-300 dark:border-border p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-secondary flex items-center justify-center mx-auto text-zinc-500 dark:text-muted-foreground">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-foreground">
            No collections yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-muted-foreground leading-relaxed">
            Organize drops you love into personal aesthetic moodboards, project references, or gear lists.
          </p>
        </div>
      )}
    </div>
  );
}
