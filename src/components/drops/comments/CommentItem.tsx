'use client';

import { useState } from 'react';
import { Reply, Trash2, Loader2, CornerDownRight } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { CommentWithReplies } from '@/actions/comments';

interface CommentItemProps {
  comment: CommentWithReplies;
  currentUserId?: string;
  onReply: (parentId: string, content: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = currentUserId === comment.userId;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submittingReply) return;

    setSubmittingReply(true);
    const success = await onReply(comment.id, replyContent.trim());
    setSubmittingReply(false);

    if (success) {
      setReplyContent('');
      setIsReplying(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    setDeleting(true);
    await onDelete(comment.id);
    setDeleting(false);
  };

  return (
    <div className="space-y-3">
      {/* Main Comment Row */}
      <div className="flex gap-3 group">
        <img
          src={comment.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
          alt={comment.user.displayName}
          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-zinc-100/80 dark:bg-secondary/40 p-3 border border-zinc-200/60 dark:border-border/60">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-foreground truncate">
                  {comment.user.displayName}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-muted-foreground truncate">
                  @{comment.user.username}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-muted-foreground shrink-0">
                {timeAgo(comment.createdAt)}
              </span>
            </div>

            <p className="text-xs text-zinc-800 dark:text-foreground/90 whitespace-pre-line leading-relaxed break-words">
              {comment.content}
            </p>
          </div>

          {/* Action Row: Reply & Delete */}
          <div className="flex items-center gap-3 px-1 mt-1 text-[11px] text-zinc-500 dark:text-muted-foreground">
            <button
              type="button"
              onClick={() => setIsReplying(!isReplying)}
              className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-foreground font-semibold cursor-pointer transition-colors"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>

            {isAuthor && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-destructive font-medium cursor-pointer transition-colors opacity-70 group-hover:opacity-100"
              >
                {deleting ? (
                  <Loader2 className="w-3 h-3 animate-spin text-destructive" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                <span>Delete</span>
              </button>
            )}
          </div>

          {/* Inline Reply Form */}
          {isReplying && (
            <form onSubmit={handleSendReply} className="mt-2.5 flex items-start gap-2 animate-in fade-in duration-150">
              <CornerDownRight className="w-4 h-4 text-zinc-400 shrink-0 mt-2 ml-1" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={`Replying to @${comment.user.username}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-card border border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyContent.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0 transition-opacity"
                >
                  {submittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
                </button>
              </div>
            </form>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-2 pl-3 border-l-2 border-zinc-200/80 dark:border-border/60 space-y-3">
              {comment.replies.map((reply) => {
                const isReplyAuthor = currentUserId === reply.userId;
                return (
                  <div key={reply.id} className="flex gap-2.5 group/reply">
                    <img
                      src={reply.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
                      alt={reply.user.displayName}
                      className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-border mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="rounded-xl bg-zinc-100/60 dark:bg-secondary/30 p-2.5 border border-zinc-200/50 dark:border-border/50">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-bold text-zinc-900 dark:text-foreground truncate">
                              {reply.user.displayName}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-muted-foreground truncate">
                              @{reply.user.username}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-400 dark:text-muted-foreground shrink-0">
                            {timeAgo(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-800 dark:text-foreground/90 whitespace-pre-line leading-relaxed break-words">
                          {reply.content}
                        </p>
                      </div>

                      {isReplyAuthor && (
                        <div className="px-1 mt-0.5">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('Delete this reply?')) return;
                              await onDelete(reply.id);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-destructive font-medium cursor-pointer transition-colors opacity-70 group-hover/reply:opacity-100"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
