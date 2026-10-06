'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Bookmark,
  Plus,
  Lock,
  Globe,
  Check,
  X,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import {
  getUserCollections,
  getDropSavedCollections,
  saveDropToCollection,
  removeDropFromCollection,
  createCollection,
  CollectionSummary,
} from '@/actions/collections';
import { toast } from 'sonner';

interface SaveToCollectionModalProps {
  dropId: string;
  dropTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveStateChange?: (savedCountChange: number) => void;
}

export function SaveToCollectionModal({
  dropId,
  dropTitle,
  isOpen,
  onClose,
  onSaveStateChange,
}: SaveToCollectionModalProps) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [savedCollectionIds, setSavedCollectionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Create new collection inline state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [creatingLoading, setCreatingLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    Promise.all([getUserCollections(), getDropSavedCollections(dropId)])
      .then(([cols, savedIds]) => {
        if (!mounted) return;
        setCollections(cols);
        setSavedCollectionIds(new Set(savedIds));
      })
      .catch((err) => {
        console.error('Failed to load collections:', err);
        toast.error('Không thể tải danh sách bộ sưu tập');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, dropId]);

  if (!isOpen) return null;

  const handleToggleCollection = (colId: string) => {
    const isCurrentlySaved = savedCollectionIds.has(colId);

    // Optimistic toggle
    const nextSavedIds = new Set(savedCollectionIds);
    if (isCurrentlySaved) {
      nextSavedIds.delete(colId);
    } else {
      nextSavedIds.add(colId);
    }
    setSavedCollectionIds(nextSavedIds);

    startTransition(async () => {
      try {
        if (isCurrentlySaved) {
          const res = await removeDropFromCollection(colId, dropId);
          if (!res.success) {
            // Rollback
            setSavedCollectionIds(savedCollectionIds);
            toast.error(res.error || 'Không thể xóa khỏi bộ sưu tập');
            return;
          }
          toast.success('Đã xóa khỏi bộ sưu tập');
          onSaveStateChange?.(-1);
        } else {
          const res = await saveDropToCollection(colId, dropId);
          if (!res.success) {
            // Rollback
            setSavedCollectionIds(savedCollectionIds);
            toast.error(res.error || 'Không thể lưu vào bộ sưu tập');
            return;
          }
          toast.success('Đã lưu vào bộ sưu tập');
          onSaveStateChange?.(1);
        }
      } catch {
        setSavedCollectionIds(savedCollectionIds);
        toast.error('Không thể kết nối máy chủ khi cập nhật bộ sưu tập');
      }
    });
  };

  const handleCreateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setCreatingLoading(true);
    try {
      const res = await createCollection({
        title: trimmed,
        isPrivate: newIsPrivate,
      });

      if (!res.success || !res.collection) {
        toast.error(res.error || 'Không thể tạo bộ sưu tập mới');
        return;
      }

      const newCol = res.collection;
      setCollections((prev) => [newCol, ...prev]);

      // Automatically save drop to the new collection
      const saveRes = await saveDropToCollection(newCol.id, dropId);
      if (saveRes.success) {
        setSavedCollectionIds((prev) => new Set(prev).add(newCol.id));
        toast.success(`Đã tạo "${trimmed}" và lưu tác phẩm!`);
        onSaveStateChange?.(1);
      }

      setNewTitle('');
      setIsCreating(false);
    } catch {
      toast.error('Lỗi khi tạo bộ sưu tập');
    } finally {
      setCreatingLoading(false);
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-secondary flex items-center justify-center text-zinc-900 dark:text-foreground">
              <Bookmark className="w-4 h-4 fill-foreground/20 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-foreground">
                Lưu vào bộ sưu tập
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-muted-foreground truncate max-w-[240px]">
                {dropTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-secondary text-zinc-400 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground cursor-pointer transition-colors"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collections List */}
        <div className="py-3 max-h-60 overflow-y-auto space-y-1.5">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400 dark:text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs">Đang tải danh sách bộ sưu tập...</span>
            </div>
          ) : collections.length === 0 && !isCreating ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-zinc-500 dark:text-muted-foreground">
                Bạn chưa có bộ sưu tập nào.
              </p>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo bộ sưu tập đầu tiên</span>
              </button>
            </div>
          ) : (
            collections.map((col) => {
              const isSaved = savedCollectionIds.has(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleToggleCollection(col.id)}
                  disabled={isPending}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSaved
                      ? 'border-zinc-900/30 dark:border-foreground/30 bg-zinc-100 dark:bg-secondary/80 text-zinc-900 dark:text-foreground font-semibold'
                      : 'border-zinc-200/80 dark:border-border/60 hover:bg-zinc-50 dark:hover:bg-secondary/40 text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-muted shrink-0 border border-zinc-200/60 dark:border-border/50 flex items-center justify-center">
                      {col.previewImages[0] ? (
                        <img
                          src={col.previewImages[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Bookmark className="w-4 h-4 text-zinc-400 dark:text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-900 dark:text-foreground truncate flex items-center gap-1.5">
                        <span>{col.title}</span>
                        {col.isPrivate ? (
                          <Lock className="w-3 h-3 text-zinc-400" />
                        ) : (
                          <Globe className="w-3 h-3 text-zinc-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-muted-foreground">
                        {col.itemsCount} tác phẩm
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shrink-0 ml-2 ${
                      isSaved
                        ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-foreground dark:border-foreground dark:text-background'
                        : 'border-zinc-300 dark:border-border text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Create Collection Inline Form or Trigger */}
        <div className="pt-3 border-t border-zinc-100 dark:border-border/60">
          {isCreating ? (
            <form onSubmit={handleCreateAndSave} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-900 dark:text-foreground block mb-1">
                  Tên bộ sưu tập
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  autoFocus
                  placeholder="Ví dụ: Cảm hứng bàn làm việc, Hà Nội hoài niệm..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-border bg-zinc-50/60 dark:bg-secondary/40 text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newIsPrivate}
                    onChange={(e) => setNewIsPrivate(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-border text-foreground focus:ring-foreground/20"
                  />
                  <span>Bộ sưu tập riêng tư (Chỉ mình bạn xem được)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 dark:text-muted-foreground hover:bg-zinc-100 dark:hover:bg-secondary cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingLoading || !newTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  {creatingLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Tạo & Lưu tác phẩm</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-4 rounded-full border border-dashed border-zinc-300 dark:border-border/80 hover:border-zinc-500 dark:hover:border-foreground/40 text-xs font-semibold text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tạo bộ sưu tập mới</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
