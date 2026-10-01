'use client';

import { useState } from 'react';
import { BookmarkMinus, Loader2 } from 'lucide-react';
import { removeDropFromCollection } from '@/actions/collections';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface RemoveFromCollectionButtonProps {
  collectionId: string;
  dropId: string;
}

export function RemoveFromCollectionButton({
  collectionId,
  dropId,
}: RemoveFromCollectionButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('Remove this drop from this collection?')) return;

    setLoading(true);
    try {
      const res = await removeDropFromCollection(collectionId, dropId);
      if (!res.success) {
        toast.error(res.error || 'Failed to remove drop');
        return;
      }

      toast.success('Removed from collection');
      router.refresh();
    } catch {
      toast.error('Error removing drop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      title="Remove from this collection"
      className="p-1.5 rounded-full bg-white/90 dark:bg-background/90 hover:bg-destructive hover:text-destructive-foreground text-zinc-600 dark:text-muted-foreground backdrop-blur-md border border-zinc-200/80 dark:border-border/60 transition-colors shadow-xs cursor-pointer"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <BookmarkMinus className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
