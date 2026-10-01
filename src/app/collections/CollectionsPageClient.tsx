'use client';

import { useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal';

interface CollectionsPageClientProps {
  user: {
    id: string;
    username: string;
    displayName: string;
  } | null;
}

export function CollectionsPageClient({ user }: CollectionsPageClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-border/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Personal Curations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-foreground">
            Collections
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-muted-foreground mt-1">
            Visual groupings, personal project references, and aesthetic moodboards.
          </p>
        </div>

        {user && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
          </button>
        )}
      </div>

      <CreateCollectionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
}
