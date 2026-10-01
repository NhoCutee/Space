'use client';

import { useState } from 'react';
import { Settings, Trash2, Edit3, Lock, Globe, Loader2, X } from 'lucide-react';
import { updateCollection, deleteCollection } from '@/actions/collections';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CollectionDetailActionsProps {
  collectionId: string;
  initialTitle: string;
  initialDescription?: string | null;
  initialIsPrivate: boolean;
}

export function CollectionDetailActions({
  collectionId,
  initialTitle,
  initialDescription,
  initialIsPrivate,
}: CollectionDetailActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || '');
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      const res = await updateCollection(collectionId, {
        title: trimmed,
        description: description.trim() || null,
        isPrivate,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to update collection');
        return;
      }

      toast.success('Collection updated');
      setIsEditOpen(false);
      router.refresh();
    } catch {
      toast.error('Error updating collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (
      !window.confirm(
        'Are you sure you want to delete this collection? Drops will remain in their respective Spaces.'
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await deleteCollection(collectionId);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete collection');
        return;
      }

      toast.success('Collection deleted');
      router.push('/collections');
      router.refresh();
    } catch {
      toast.error('Error deleting collection');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-secondary/70 dark:hover:bg-secondary text-zinc-700 dark:text-foreground border border-zinc-200 dark:border-border/60 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-destructive/10 text-zinc-500 hover:text-destructive border border-zinc-200 dark:border-border/60 transition-colors cursor-pointer"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          <span>Delete</span>
        </button>
      </div>

      {/* Edit Collection Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsEditOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white dark:bg-card shadow-2xl p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-border/60">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-foreground">
                Edit Collection
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-secondary text-zinc-400 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="py-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground block mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-border bg-zinc-50/60 dark:bg-secondary/40 text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-border bg-zinc-50/60 dark:bg-secondary/40 text-zinc-900 dark:text-foreground text-xs placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-border text-foreground focus:ring-foreground/20"
                  />
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-foreground block">
                      Private Collection
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-muted-foreground block">
                      Only you can view and curate this collection.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-border/60">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-muted-foreground hover:bg-zinc-100 dark:hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
