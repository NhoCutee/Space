'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, ChevronDown, Check } from 'lucide-react';
import {
  CommentWithReplies,
  CommentSortBy,
  createComment,
  deleteComment,
  updateComment,
  toggleCommentReaction,
  getThreadedComments,
  getCommentReplies,
} from '@/actions/comments';
import { CommentItem } from './CommentItem';
import { DeleteCommentModal, DeleteCommentTarget } from './DeleteCommentModal';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import { toast } from 'sonner';

const SORT_OPTIONS: {
  key: CommentSortBy;
  label: string;
  description: string;
}[] = [
  {
    key: 'relevant',
    label: 'Phù hợp nhất',
    description: 'Hiển thị bình luận có nhiều tương tác và phản hồi nhất.',
  },
  {
    key: 'newest',
    label: 'Mới nhất',
    description: 'Hiển thị bình luận mới nhất trước.',
  },
  {
    key: 'oldest',
    label: 'Tất cả bình luận (Cũ nhất)',
    description: 'Hiển thị tất cả bình luận theo thứ tự thời gian gốc.',
  },
];

interface CommentThreadProps {
  dropId?: string;
  spaceId?: string;
  initialComments: CommentWithReplies[];
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  currentUserId?: string;
  currentUsername?: string;
  currentAvatarUrl?: string | null;
  onCommentsCountChange?: (count: number) => void;
  title?: string;
  placeholder?: string;
}

export function CommentThread({
  dropId,
  spaceId,
  initialComments,
  initialHasMore = false,
  initialNextCursor = null,
  currentUserId,
  currentUsername,
  currentAvatarUrl,
  onCommentsCountChange,
  title = 'Bình luận & Thảo luận',
  placeholder = 'Chia sẻ góc nhìn, hỏi về thông số, thiết bị hoặc không gian...',
}: CommentThreadProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sorting state & Facebook-style Dropdown
  const [sortBy, setSortBy] = useState<CommentSortBy>('relevant');
  const [isSorting, setIsSorting] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close sorting dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortDropdownOpen]);

  // Pagination state
  const [hasMore, setHasMore] = useState(initialHasMore || initialComments.length >= 10);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor || (initialComments.length > 0 ? initialComments[initialComments.length - 1].id : null)
  );
  const [loadingMore, setLoadingMore] = useState(false);

  // Loading state for on-demand replies per comment
  const [loadingRepliesId, setLoadingRepliesId] = useState<string | null>(null);

  // Custom Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<DeleteCommentTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute total comments count (top comments + replies)
  const totalComments = comments.reduce(
    (acc, c) => acc + (c.deletedAt ? 0 : 1) + (c.replies?.filter((r) => !r.deletedAt).length || 0),
    0
  );

  // Synchronize count to parent component
  useEffect(() => {
    onCommentsCountChange?.(totalComments);
  }, [totalComments, onCommentsCountChange]);

  // Realtime Event Listeners
  const handleRealtimeCreated = useCallback((newComment: CommentWithReplies) => {
    setComments((prev) => {
      // Top-level comment
      if (!newComment.parentId) {
        if (prev.some((c) => c.id === newComment.id)) {
          return prev;
        }
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
            repliesCount: (c.repliesCount || replies.length) + 1,
            replies: [...replies, newComment],
          };
        }
        return c;
      });
    });
  }, []);

  const handleRealtimeUpdated = useCallback((updatedComment: CommentWithReplies) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === updatedComment.id) {
          return {
            ...c,
            content: updatedComment.content,
            isEdited: true,
            updatedAt: updatedComment.updatedAt,
          };
        }
        if (c.replies && c.replies.some((r) => r.id === updatedComment.id)) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === updatedComment.id
                ? { ...r, content: updatedComment.content, isEdited: true, updatedAt: updatedComment.updatedAt }
                : r
            ),
          };
        }
        return c;
      })
    );
  }, []);

  const handleRealtimeDeleted = useCallback(
    (commentId: string, parentId?: string | null, deletedCount = 1, isSoftDeleted = false) => {
      void deletedCount;
      setComments((prev) => {
        if (!parentId) {
          if (isSoftDeleted) {
            return prev.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    deletedAt: new Date(),
                    content: 'Bình luận này đã bị xóa.',
                  }
                : c
            );
          }
          return prev.filter((c) => c.id !== commentId);
        }

        // Inside a reply
        return prev.map((c) => {
          if (c.id === parentId && c.replies) {
            if (isSoftDeleted) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId
                    ? {
                        ...r,
                        deletedAt: new Date(),
                        content: 'Câu trả lời này đã bị xóa.',
                      }
                    : r
                ),
              };
            }
            return {
              ...c,
              repliesCount: Math.max(0, (c.repliesCount || c.replies.length) - 1),
              replies: c.replies.filter((r) => r.id !== commentId),
            };
          }
          return c;
        });
      });
    },
    []
  );

  const handleRealtimeReacted = useCallback(
    (commentId: string, reactionsCount: number, parentId?: string | null) => {
      setComments((prev) => {
        if (!parentId) {
          return prev.map((c) =>
            c.id === commentId ? { ...c, reactionsCount } : c
          );
        }
        return prev.map((c) => {
          if (c.id === parentId && c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, reactionsCount } : r
              ),
            };
          }
          return c;
        });
      });
    },
    []
  );

  useRealtimeComments({
    spaceId,
    dropId,
    onCommentCreated: handleRealtimeCreated,
    onCommentUpdated: handleRealtimeUpdated,
    onCommentDeleted: handleRealtimeDeleted,
    onCommentReacted: handleRealtimeReacted,
  });

  // Sort Handler
  const handleSortChange = async (newSort: CommentSortBy) => {
    if (newSort === sortBy || isSorting) return;
    setSortBy(newSort);
    setIsSorting(true);

    try {
      const res = await getThreadedComments({
        spaceId,
        dropId,
        sortBy: newSort,
        limit: 10,
      });

      setComments(res.comments);
      setHasMore(res.hasMore);
      setNextCursor(res.nextCursor);
    } catch {
      toast.error('Không thể tải danh sách bình luận');
    } finally {
      setIsSorting(false);
    }
  };

  // Pagination Load More Handler
  const handleLoadMoreComments = async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);

    try {
      const res = await getThreadedComments({
        spaceId,
        dropId,
        sortBy,
        cursor: nextCursor,
        limit: 10,
      });

      setComments((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const uniqueNew = res.comments.filter((c) => !existingIds.has(c.id));
        return [...prev, ...uniqueNew];
      });
      setHasMore(res.hasMore);
      setNextCursor(res.nextCursor);
    } catch {
      toast.error('Không thể tải thêm bình luận');
    } finally {
      setLoadingMore(false);
    }
  };

  // On-demand load more replies for a top comment
  const handleLoadMoreReplies = async (parentId: string) => {
    const parent = comments.find((c) => c.id === parentId);
    if (!parent || loadingRepliesId) return;

    setLoadingRepliesId(parentId);
    try {
      const skip = parent.replies?.length || 0;
      const res = await getCommentReplies(parentId, { skip, take: 5 });

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            const currentReplies = c.replies || [];
            const existingIds = new Set(currentReplies.map((r) => r.id));
            const newReplies = res.replies.filter((r) => !existingIds.has(r.id));
            return {
              ...c,
              repliesCount: res.totalReplies,
              hasMoreReplies: res.hasMore,
              replies: [...currentReplies, ...newReplies],
            };
          }
          return c;
        })
      );
    } catch {
      toast.error('Không thể tải thêm câu trả lời');
    } finally {
      setLoadingRepliesId(null);
    }
  };

  // Toggle Reaction Handler with Optimistic UI
  const handleToggleReaction = async (commentId: string, parentId?: string | null) => {
    if (!currentUserId) {
      toast.error('Bạn cần đăng nhập để thả tim bình luận');
      return;
    }

    // Locate comment or reply
    let wasReacted = false;
    let originalCount = 0;

    if (!parentId) {
      const c = comments.find((item) => item.id === commentId);
      if (!c) return;
      wasReacted = c.userReaction === 'HEART';
      originalCount = c.reactionsCount;
    } else {
      const parent = comments.find((item) => item.id === parentId);
      const reply = parent?.replies?.find((r) => r.id === commentId);
      if (!reply) return;
      wasReacted = reply.userReaction === 'HEART';
      originalCount = reply.reactionsCount;
    }

    const nextReacted = !wasReacted;
    const nextCount = nextReacted ? originalCount + 1 : Math.max(0, originalCount - 1);

    // Apply Optimistic Update
    setComments((prev) => {
      if (!parentId) {
        return prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                reactionsCount: nextCount,
                userReaction: nextReacted ? 'HEART' : null,
              }
            : c
        );
      }
      return prev.map((c) => {
        if (c.id === parentId && c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId
                ? {
                    ...r,
                    reactionsCount: nextCount,
                    userReaction: nextReacted ? 'HEART' : null,
                  }
                : r
            ),
          };
        }
        return c;
      });
    });

    try {
      const res = await toggleCommentReaction(commentId, 'HEART');
      if (!res.success) {
        // Revert on server error
        throw new Error(res.error || 'Lỗi thao tác cảm xúc');
      }
    } catch {
      // Revert optimistic update
      setComments((prev) => {
        if (!parentId) {
          return prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  reactionsCount: originalCount,
                  userReaction: wasReacted ? 'HEART' : null,
                }
              : c
          );
        }
        return prev.map((c) => {
          if (c.id === parentId && c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      reactionsCount: originalCount,
                      userReaction: wasReacted ? 'HEART' : null,
                    }
                  : r
              ),
            };
          }
          return c;
        });
      });
      toast.error('Không thể cập nhật cảm xúc');
    }
  };

  // Post Top-level Comment
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
        if (sortBy === 'oldest') {
          return [...prev, created];
        }
        return [created, ...prev];
      });
      setNewContent('');
      toast.success('Đã đăng bình luận');

    } catch {
      toast.error('Lỗi khi đăng bình luận');
    } finally {
      setSubmitting(false);
    }
  };

  // Post Reply
  const handleReply = async (
    parentId: string,
    content: string
  ): Promise<boolean> => {
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
              repliesCount: (c.repliesCount || replies.length) + 1,
              replies: [...replies, createdReply],
            };
          }
          return c;
        })
      );

      toast.success('Đã gửi câu trả lời');
      return true;
    } catch {
      toast.error('Lỗi khi gửi câu trả lời');
      return false;
    }
  };

  // Edit Comment / Reply
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
              isEdited: true,
              updatedAt: new Date(),
            };
          }
          if (c.replies && c.replies.some((r) => r.id === commentId)) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, content, isEdited: true, updatedAt: new Date() }
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

  // Delete Comment / Reply
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await deleteComment(deleteTarget.id);
      if (!res.success) {
        toast.error(res.error || 'Không thể xóa bình luận');
        return;
      }

      const isSoftDeleted = Boolean(res.isSoftDeleted);

      setComments((prev) => {
        if (!deleteTarget.isReply) {
          if (isSoftDeleted) {
            return prev.map((c) =>
              c.id === deleteTarget.id
                ? {
                    ...c,
                    deletedAt: new Date(),
                    content: 'Bình luận này đã bị xóa.',
                  }
                : c
            );
          }
          return prev.filter((c) => c.id !== deleteTarget.id);
        }

        // Inside a reply
        return prev.map((c) => {
          if (c.replies && c.replies.some((r) => r.id === deleteTarget.id)) {
            if (isSoftDeleted) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === deleteTarget.id
                    ? {
                        ...r,
                        deletedAt: new Date(),
                        content: 'Câu trả lời này đã bị xóa.',
                      }
                    : r
                ),
              };
            }
            return {
              ...c,
              repliesCount: Math.max(0, (c.repliesCount || c.replies.length) - 1),
              replies: c.replies.filter((r) => r.id !== deleteTarget.id),
            };
          }
          return c;
        });
      });

      toast.success(deleteTarget.isReply ? 'Đã xóa câu trả lời' : 'Đã xóa bình luận');
      setDeleteTarget(null);
    } catch {
      toast.error('Lỗi khi xóa bình luận');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with realtime status and Facebook-style sort dropdown */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-foreground truncate">
            {title}
          </h3>
        </div>

        {/* Facebook-style Sort Dropdown */}
        <div ref={sortDropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsSortDropdownOpen((prev) => !prev)}
            disabled={isSorting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/60 dark:border-border/60 transition-colors cursor-pointer select-none"
            aria-expanded={isSortDropdownOpen}
            aria-haspopup="listbox"
            title="Thay đổi cách sắp xếp bình luận"
          >
            <span>{SORT_OPTIONS.find((opt) => opt.key === sortBy)?.label || 'Phù hợp nhất'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isSortDropdownOpen ? 'rotate-180 text-zinc-700 dark:text-zinc-200' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isSortDropdownOpen && (
            <div
              role="listbox"
              className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-border/80 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
            >
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-muted-foreground border-b border-zinc-100 dark:border-border/50 mb-1">
                Sắp xếp bình luận
              </div>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortBy === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      handleSortChange(opt.key);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-foreground font-semibold'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <div className="mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center">
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-foreground">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-muted-foreground font-normal leading-tight mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-[10px] text-zinc-400 dark:text-muted-foreground">
                {newContent.length}/1000
              </span>
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

      {/* Sorting Loading Indicator */}
      {isSorting && (
        <div className="flex items-center justify-center py-6 gap-2 text-xs text-zinc-400 dark:text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang sắp xếp bình luận...</span>
        </div>
      )}

      {/* Comments List */}
      {!isSorting && (
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
                currentUserUsername={currentUsername}
                onReply={handleReply}
                onEdit={handleEdit}
                onDeleteRequest={(target) => setDeleteTarget(target)}
                onToggleReaction={handleToggleReaction}
                onLoadMoreReplies={handleLoadMoreReplies}
                isLoadingReplies={loadingRepliesId === comment.id}
              />
            ))
          )}

          {/* Pagination: Load More Comments Button */}
          {hasMore && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={handleLoadMoreComments}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/70 dark:bg-secondary dark:hover:bg-secondary/80 text-zinc-700 dark:text-foreground border border-zinc-200/60 dark:border-border/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Xem thêm bình luận</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

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
