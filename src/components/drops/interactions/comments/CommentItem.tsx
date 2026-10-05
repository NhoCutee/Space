'use client';

import { useState } from 'react';
import { Reply, Trash2, Pencil, Check, CornerDownRight, Loader2 } from 'lucide-react';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { CommentWithReplies } from '@/actions/comments';
import { DeleteCommentTarget } from './DeleteCommentModal';

interface CommentItemProps {
  comment: CommentWithReplies;
  currentUserId?: string;
  onReply: (parentId: string, content: string) => Promise<boolean>;
  onEdit: (commentId: string, content: string) => Promise<boolean>;
  onDeleteRequest: (target: DeleteCommentTarget) => void;
  onDelete?: (commentId: string) => Promise<boolean>;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDeleteRequest,
  onDelete,
}: CommentItemProps) {
  // Main comment edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [savingEdit, setSavingEdit] = useState(false);

  // Reply form state
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const isAuthor = currentUserId === comment.userId;

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || savingEdit) return;
    if (trimmed === comment.content) {
      setIsEditing(false);
      return;
    }

    setSavingEdit(true);
    const success = await onEdit(comment.id, trimmed);
    setSavingEdit(false);

    if (success) {
      setIsEditing(false);
    }
  };

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

  const handleDeleteClick = () => {
    if (onDeleteRequest) {
      onDeleteRequest({
        id: comment.id,
        content: comment.content,
        isReply: false,
        repliesCount: comment.replies?.length || 0,
        user: comment.user,
      });
    } else if (onDelete) {
      onDelete(comment.id);
    }
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
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-foreground truncate">
                  {comment.user.displayName}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-muted-foreground truncate">
                  @{comment.user.username}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-[10px] text-zinc-400 dark:text-muted-foreground">
                <RelativeTime
                  createdAt={comment.createdAt}
                  updatedAt={comment.updatedAt}
                  showBothIfEdited
                />
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2 mt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      handleSaveEdit();
                    }
                  }}
                  rows={Math.min(6, Math.max(2, editContent.split('\n').length))}
                  maxLength={1000}
                  autoFocus
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-card border border-zinc-300 dark:border-border text-zinc-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-foreground/20 leading-relaxed resize-none shadow-2xs"
                  placeholder="Nhập nội dung chỉnh sửa..."
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-zinc-400 dark:text-muted-foreground text-[10px]">
                    {editContent.length}/1000 • <kbd className="font-mono text-[9px] bg-zinc-200/70 dark:bg-secondary px-1 py-0.5 rounded">Ctrl+Enter</kbd> để lưu • <kbd className="font-mono text-[9px] bg-zinc-200/70 dark:bg-secondary px-1 py-0.5 rounded">Esc</kbd> để hủy
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(comment.content);
                      }}
                      disabled={savingEdit}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={savingEdit || !editContent.trim() || editContent.trim() === comment.content}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                    >
                      {savingEdit ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Lưu</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-800 dark:text-foreground/90 whitespace-pre-line leading-relaxed break-words">
                {comment.content}
              </p>
            )}
          </div>

          {/* Action Row: Reply, Edit, Delete */}
          {!isEditing && (
            <div className="flex items-center gap-3.5 px-1 mt-1 text-[11px] text-zinc-500 dark:text-muted-foreground">
              <button
                type="button"
                onClick={() => setIsReplying(!isReplying)}
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-foreground font-semibold cursor-pointer transition-colors"
              >
                <Reply className="w-3 h-3" />
                <span>Trả lời</span>
              </button>

              {isAuthor && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(comment.content);
                    }}
                    className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-foreground font-medium cursor-pointer transition-colors opacity-75 group-hover:opacity-100"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer transition-colors opacity-75 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Inline Reply Form */}
          {isReplying && (
            <form onSubmit={handleSendReply} className="mt-2.5 flex items-start gap-2 animate-in fade-in duration-150">
              <CornerDownRight className="w-4 h-4 text-zinc-400 shrink-0 mt-2 ml-1" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={`Trả lời @${comment.user.username}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-card border border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyContent.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0 transition-opacity"
                >
                  {submittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Gửi'}
                </button>
              </div>
            </form>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-2 pl-3 border-l-2 border-zinc-200/80 dark:border-border/60 space-y-3">
              {comment.replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  currentUserId={currentUserId}
                  onEdit={onEdit}
                  onDeleteRequest={onDeleteRequest}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyItemProps {
  reply: CommentWithReplies;
  currentUserId?: string;
  onEdit: (commentId: string, content: string) => Promise<boolean>;
  onDeleteRequest: (target: DeleteCommentTarget) => void;
  onDelete?: (commentId: string) => Promise<boolean>;
}

function ReplyItem({
  reply,
  currentUserId,
  onEdit,
  onDeleteRequest,
  onDelete,
}: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [savingEdit, setSavingEdit] = useState(false);

  const isReplyAuthor = currentUserId === reply.userId;

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || savingEdit) return;
    if (trimmed === reply.content) {
      setIsEditing(false);
      return;
    }

    setSavingEdit(true);
    const success = await onEdit(reply.id, trimmed);
    setSavingEdit(false);

    if (success) {
      setIsEditing(false);
    }
  };

  const handleDeleteClick = () => {
    if (onDeleteRequest) {
      onDeleteRequest({
        id: reply.id,
        content: reply.content,
        isReply: true,
        user: reply.user,
      });
    } else if (onDelete) {
      onDelete(reply.id);
    }
  };

  return (
    <div className="flex gap-2.5 group/reply">
      <img
        src={reply.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
        alt={reply.user.displayName}
        className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-border mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-zinc-100/60 dark:bg-secondary/30 p-2.5 border border-zinc-200/50 dark:border-border/50">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-bold text-zinc-900 dark:text-foreground truncate">
                {reply.user.displayName}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-muted-foreground truncate">
                @{reply.user.username}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[9px] text-zinc-400 dark:text-muted-foreground">
              <RelativeTime
                createdAt={reply.createdAt}
                updatedAt={reply.updatedAt}
                showBothIfEdited
              />
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-1.5 mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(reply.content);
                  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handleSaveEdit();
                  }
                }}
                rows={Math.min(5, Math.max(2, editContent.split('\n').length))}
                maxLength={1000}
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-card border border-zinc-300 dark:border-border text-zinc-900 dark:text-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20 leading-relaxed resize-none shadow-2xs"
                placeholder="Nhập nội dung chỉnh sửa..."
              />
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                <span className="text-zinc-400 dark:text-muted-foreground">
                  {editContent.length}/1000 • <kbd className="font-mono text-[8px] bg-zinc-200/70 dark:bg-secondary px-1 py-0.5 rounded">Ctrl+Enter</kbd>
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(reply.content);
                    }}
                    disabled={savingEdit}
                    className="px-2 py-0.5 rounded text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editContent.trim() || editContent.trim() === reply.content}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                  >
                    {savingEdit ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Check className="w-2.5 h-2.5" />
                    )}
                    <span>Lưu</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-800 dark:text-foreground/90 whitespace-pre-line leading-relaxed break-words">
              {reply.content}
            </p>
          )}
        </div>

        {/* Reply Action Buttons */}
        {isReplyAuthor && !isEditing && (
          <div className="flex items-center gap-2.5 px-1 mt-0.5 text-[10px] text-zinc-500 dark:text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditContent(reply.content);
              }}
              className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-foreground font-medium cursor-pointer transition-colors opacity-75 group-hover/reply:opacity-100"
            >
              <Pencil className="w-2.5 h-2.5" />
              <span>Sửa</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteClick}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer transition-colors opacity-75 group-hover/reply:opacity-100"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Xóa</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
