'use client';

import { useState } from 'react';
import { Plus, X, Loader2, FolderPlus } from 'lucide-react';
import { createCollection } from '@/actions/collections';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCollectionModal({ isOpen, onClose }: CreateCollectionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      const res = await createCollection({
        title: trimmed,
        description: description.trim() || undefined,
        isPrivate,
      });

      if (!res.success || !res.collection) {
        toast.error(res.error || 'Failed to create collection');
        return;
      }

      toast.success('Collection created!');
      setTitle('');
      setDescription('');
      setIsPrivate(false);
      onClose();
      router.refresh();
      router.push(`/c/${res.collection.id}`);
    } catch {
      toast.error('Error creating collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white dark:bg-card shadow-2xl p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-secondary flex items-center justify-center text-zinc-900 dark:text-foreground">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-foreground">
              Create New Collection
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-secondary text-zinc-400 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground block mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              autoFocus
              placeholder="e.g. Minimalist Desks, Japanese Denim..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-border bg-zinc-50/60 dark:bg-secondary/40 text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground block mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              maxLength={300}
              placeholder="What is the mood, theme, or intent behind this collection?"
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
                  Only you can view and add drops to this collection.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-muted-foreground hover:bg-zinc-100 dark:hover:bg-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Create Collection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
