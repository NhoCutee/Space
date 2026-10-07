'use client';

import { useEffect } from 'react';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';

export interface DeleteCommentTarget {
  id: string;
  content: string;
  isReply: boolean;
  repliesCount?: number;
  user: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
}

interface DeleteCommentModalProps {
  isOpen: boolean;
  target: DeleteCommentTarget | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function DeleteCommentModal({
  isOpen,
  target,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteCommentModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge & Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/70 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {target.isReply ? 'Xóa câu trả lời?' : 'Xóa bình luận?'}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Bạn có chắc chắn muốn xóa {target.isReply ? 'câu trả lời' : 'bình luận'} này không?
              Hành động này sẽ xóa dữ liệu vĩnh viễn và không thể khôi phục.
            </p>
          </div>
        </div>

        {/* Content Snippet Preview */}
        <div className="mt-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <img
              src={target.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
              alt={target.user.displayName}
              className="w-4 h-4 rounded-full object-cover ring-1 ring-border shrink-0"
            />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {target.user.displayName}
            </span>
            <span className="text-[10px] text-zinc-400 truncate">
              @{target.user.username}
            </span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-300 line-clamp-3 italic whitespace-pre-line leading-relaxed">
            &ldquo;{target.content}&rdquo;
          </p>
        </div>

        {/* Notice if top-level comment has nested replies */}
        {!target.isReply && (target.repliesCount || 0) > 0 && (
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <span>
              Lưu ý: Bình luận này có <strong>{target.repliesCount}</strong> câu trả lời. Nội dung bình luận sẽ được ẩn và đánh dấu đã xóa để bảo toàn các câu trả lời bên dưới.
            </span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa bình luận</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
