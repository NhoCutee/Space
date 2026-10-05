'use client';

import { useState, useCallback } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import {
  CommentWithReplies,
  createComment,
  deleteComment,
  updateComment,
} from '@/actions/comments';
import { CommentItem } from './CommentItem';
import { DeleteCommentModal, DeleteCommentTarget } from './DeleteCommentModal';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import { toast } from 'sonner';

interface CommentThreadProps {
  dropId?: string;
  spaceId?: string;
  initialComments: CommentWithReplies[];
  currentUserId?: string;
  currentAvatarUrl?: string | null;
  onCommentsCountChange?: (count: number) => void;
  title?: string;
  placeholder?: string;
}

export function CommentThread({
  dropId,
  spaceId,
  initialComments,
  currentUserId,
  currentAvatarUrl,
  onCommentsCountChange,
  title = 'Bình luận & Thảo luận',
  placeholder = 'Chia sẻ góc nhìn, hỏi về thông số, thiết bị hoặc không gian...',
}: CommentThreadProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Custom Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<DeleteCommentTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute total comments including replies
  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  // Realtime Event Listeners
  const handleRealtimeCreated = useCallback((newComment: CommentWithReplies) => {
    setComments((prev) => {
      // Top-level comment
      if (!newComment.parentId) {
        if (prev.some((c) => c.id === newComment.id)) {
          return prev;
        }
        // If it belongs to a space, we list latest first
        return [newComment, ...prev];
      }

      // Reply
      return prev.map((c) => {
        if (c.id === newComment.parentId) {
          const replies = c.replies || [];
          if (replies.some((r) => r.id === newComment.id)) {
            return c;
          }
          return {
            ...c,
            replies: [...replies, newComment],
          };
        }
        return c;
      });
    });

    onCommentsCountChange?.(totalComments + 1);
  }, [totalComments, onCommentsCountChange]);

  const handleRealtimeUpdated = useCallback((updatedComment: CommentWithReplies) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === updatedComment.id) {
          return {
            ...c,
            content: updatedComment.content,
            updatedAt: updatedComment.updatedAt,
          };
        }
        if (c.replies && c.replies.some((r) => r.id === updatedComment.id)) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === updatedComment.id
                ? { ...r, content: updatedComment.content, updatedAt: updatedComment.updatedAt }
                : r
            ),
          };
        }
        return c;
      })
    );
  }, []);

  const handleRealtimeDeleted = useCallback(
    (commentId: string, parentId?: string | null, deletedCount = 1) => {
      setComments((prev) => {
        if (!parentId) {
          return prev.filter((c) => c.id !== commentId);
        }
        return prev.map((c) => ({
          ...c,
          replies: c.replies?.filter((r) => r.id !== commentId),
        }));
      });

      onCommentsCountChange?.(Math.max(0, totalComments - deletedCount));
    },
    [totalComments, onCommentsCountChange]
  );

  const { isConnected } = useRealtimeComments({
    spaceId,
    dropId,
    onCommentCreated: handleRealtimeCreated,
    onCommentUpdated: handleRealtimeUpdated,
    onCommentDeleted: handleRealtimeDeleted,
  });

  const handlePostTopComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await createComment({
        dropId,
        spaceId,
        content: trimmed,
      });

      if (!res.success || !res.comment) {
        toast.error(res.error || 'Không thể đăng bình luận');
        return;
      }

      const created = res.comment;
      setComments((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [created, ...prev];
      });
      setNewContent('');
      toast.success('Đã đăng bình luận');

      const nextTotal = totalComments + 1;
      onCommentsCountChange?.(nextTotal);
    } catch {
      toast.error('Lỗi khi đăng bình luận');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, content: string): Promise<boolean> => {
    try {
      const res = await createComment({
        dropId,
        spaceId,
        parentId,
        content,
      });

      if (!res.success || !res.comment) {
        toast.error(res.error || 'Không thể gửi câu trả lời');
        return false;
      }

      const createdReply = res.comment;
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            const replies = c.replies || [];
            if (replies.some((r) => r.id === createdReply.id)) return c;
            return {
              ...c,
              replies: [...replies, createdReply],
            };
          }
          return c;
        })
      );

      toast.success('Đã gửi câu trả lời');
      onCommentsCountChange?.(totalComments + 1);
      return true;
    } catch {
      toast.error('Lỗi khi gửi câu trả lời');
      return false;
    }
  };

  const handleEdit = async (commentId: string, content: string): Promise<boolean> => {
    try {
      const res = await updateComment({
        commentId,
        content,
      });

      if (!res.success) {
        toast.error(res.error || 'Không thể cập nhật bình luận');
        return false;
      }

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              content,
              updatedAt: new Date(),
            };
          }
          if (c.replies && c.replies.some((r) => r.id === commentId)) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, content, updatedAt: new Date() }
                  : r
              ),
            };
          }
          return c;
        })
      );

      toast.success('Đã cập nhật bình luận');
      return true;
    } catch {
      toast.error('Lỗi khi cập nhật bình luận');
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await deleteComment(deleteTarget.id);
      if (!res.success) {
        toast.error(res.error || 'Không thể xóa bình luận');
        return;
      }

      let deletedCount = 1;
      setComments((prev) => {
        const topLevel = prev.find((c) => c.id === deleteTarget.id);
        if (topLevel) {
          deletedCount += topLevel.replies?.length || 0;
          return prev.filter((c) => c.id !== deleteTarget.id);
        }

        return prev.map((c) => ({
          ...c,
          replies: c.replies?.filter((r) => r.id !== deleteTarget.id),
        }));
      });

      toast.success(deleteTarget.isReply ? 'Đã xóa câu trả lời' : 'Đã xóa bình luận');
      onCommentsCountChange?.(Math.max(0, totalComments - deletedCount));
      setDeleteTarget(null);
    } catch {
      toast.error('Lỗi khi xóa bình luận');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with counter and realtime status */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-border/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-foreground">
            {title}
          </h3>
          {isConnected && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              title="Đang cập nhật trực tiếp theo thời gian thực"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Trực tiếp</span>
            </span>
          )}
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-secondary text-zinc-600 dark:text-muted-foreground">
          {totalComments} {totalComments === 1 ? 'bình luận' : 'bình luận'}
        </span>
      </div>

      {/* Main Comment Composer */}
      {currentUserId ? (
        <form onSubmit={handlePostTopComment} className="flex gap-3 items-start">
          <img
            src={currentAvatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border mt-0.5"
          />
          <div className="flex-1 relative">
            <textarea
              rows={2}
              required
              maxLength={1000}
              placeholder={placeholder}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-zinc-200 dark:border-border bg-white dark:bg-card text-zinc-900 dark:text-foreground text-xs placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-foreground/20 resize-none leading-relaxed shadow-2xs"
            />
            <div className="flex items-center justify-end mt-1.5">
              <button
                type="submit"
                disabled={submitting || !newContent.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity shadow-xs"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Gửi bình luận</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-secondary/30 border border-zinc-200/60 dark:border-border/60 text-center text-xs text-zinc-500 dark:text-muted-foreground">
          Đăng nhập để tham gia thảo luận và trả lời người sáng tạo.
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-5 pt-2">
        {comments.length === 0 ? (
          <div className="py-8 text-center space-y-1 text-zinc-400 dark:text-muted-foreground">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Chưa có bình luận nào
            </p>
            <p className="text-[11px]">
              Hãy là người đầu tiên chia sẻ cảm nghĩ, góc nhìn hoặc đặt câu hỏi.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={handleReply}
              onEdit={handleEdit}
              onDeleteRequest={(target) => setDeleteTarget(target)}
            />
          ))
        )}
      </div>

      {/* Modern Redesigned Delete Confirmation Modal */}
      <DeleteCommentModal
        isOpen={!!deleteTarget}
        target={deleteTarget}
        isDeleting={isDeleting}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
