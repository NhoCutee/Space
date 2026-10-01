'use client';

import { useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import {
  CommentWithReplies,
  createComment,
  deleteComment,
} from '@/actions/comments';
import { CommentItem } from './CommentItem';
import { toast } from 'sonner';

interface CommentThreadProps {
  dropId: string;
  initialComments: CommentWithReplies[];
  currentUserId?: string;
  currentAvatarUrl?: string | null;
  onCommentsCountChange?: (count: number) => void;
}

export function CommentThread({
  dropId,
  initialComments,
  currentUserId,
  currentAvatarUrl,
  onCommentsCountChange,
}: CommentThreadProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Compute total comments including replies
  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  const handlePostTopComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await createComment({
        dropId,
        content: trimmed,
      });

      if (!res.success || !res.comment) {
        toast.error(res.error || 'Failed to post comment');
        return;
      }

      const nextComments = [...comments, res.comment];
      setComments(nextComments);
      setNewContent('');
      toast.success('Comment posted');

      const nextTotal = nextComments.reduce(
        (acc, c) => acc + 1 + (c.replies?.length || 0),
        0
      );
      onCommentsCountChange?.(nextTotal);
    } catch {
      toast.error('Error posting comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, content: string): Promise<boolean> => {
    try {
      const res = await createComment({
        dropId,
        parentId,
        content,
      });

      if (!res.success || !res.comment) {
        toast.error(res.error || 'Failed to post reply');
        return false;
      }

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), res.comment!],
            };
          }
          return c;
        })
      );

      toast.success('Reply posted');
      onCommentsCountChange?.(totalComments + 1);
      return true;
    } catch {
      toast.error('Error posting reply');
      return false;
    }
  };

  const handleDelete = async (commentId: string): Promise<boolean> => {
    try {
      const res = await deleteComment(commentId);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete comment');
        return false;
      }

      // Check if it was a top-level comment or a reply
      let deletedCount = 1;

      setComments((prev) => {
        const topLevel = prev.find((c) => c.id === commentId);
        if (topLevel) {
          deletedCount += topLevel.replies?.length || 0;
          return prev.filter((c) => c.id !== commentId);
        }

        // If it was a reply inside one of the top comments
        return prev.map((c) => ({
          ...c,
          replies: c.replies?.filter((r) => r.id !== commentId),
        }));
      });

      toast.success('Comment deleted');
      onCommentsCountChange?.(Math.max(0, totalComments - deletedCount));
      return true;
    } catch {
      toast.error('Error deleting comment');
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with counter */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-border/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-foreground">
            Discussion & Observations
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-secondary text-zinc-600 dark:text-muted-foreground">
          {totalComments} {totalComments === 1 ? 'thought' : 'thoughts'}
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
              placeholder="Ask about technique, share aesthetic impressions, or add context..."
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
                <span>Post Comment</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-secondary/30 border border-zinc-200/60 dark:border-border/60 text-center text-xs text-zinc-500 dark:text-muted-foreground">
          Sign in to join the conversation and reply to creators.
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-5 pt-2">
        {comments.length === 0 ? (
          <div className="py-8 text-center space-y-1 text-zinc-400 dark:text-muted-foreground">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              No thoughts shared yet
            </p>
            <p className="text-[11px]">
              Be the first to share your observation, ask about gear, or discuss the atmosphere.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
