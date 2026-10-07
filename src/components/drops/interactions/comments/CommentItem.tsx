'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Reply,
  Trash2,
  Pencil,
  Check,
  CornerDownRight,
  Loader2,
  Heart,
  UserX,
  X,
} from 'lucide-react';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { CommentWithReplies } from '@/actions/comments';
import { DeleteCommentTarget } from './DeleteCommentModal';

interface CommentItemProps {
  comment: CommentWithReplies;
  currentUserId?: string;
  onReply: (parentId: string, content: string, replyToUsername?: string) => Promise<boolean>;
  onEdit: (commentId: string, content: string) => Promise<boolean>;
  onDeleteRequest: (target: DeleteCommentTarget) => void;
  onDelete?: (commentId: string) => Promise<boolean>;
  onToggleReaction: (commentId: string, parentId?: string | null) => Promise<void>;
  onLoadMoreReplies?: (parentId: string) => Promise<void>;
  isLoadingReplies?: boolean;
}

/**
 * Parses and highlights @username mentions in comments.
 */
function FormattedCommentContent({ content }: { content: string }) {
  const parts = content.split(/(@[a-zA-Z0-9_.-]+)/g);
  return (
    <span className="whitespace-pre-line leading-relaxed break-words">
      {parts.map((part, i) => {
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          return (
            <Link
              key={i}
              href={`/u/${username}`}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-block mr-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDeleteRequest,
  onDelete,
  onToggleReaction,
  onLoadMoreReplies,
  isLoadingReplies = false,
}: CommentItemProps) {
  // Main comment edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [savingEdit, setSavingEdit] = useState(false);

  // Reply form state
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyTargetUser, setReplyTargetUser] = useState<{
    displayName: string;
    username: string;
  } | null>(null);

  const isAuthor = Boolean(currentUserId && currentUserId === comment.userId);
  const isDeleted = Boolean(comment.deletedAt);
  const hasReacted = comment.userReaction === 'HEART';

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
    const trimmed = replyContent.trim();
    if (!trimmed || submittingReply) return;

    // If replying to a specific user other than root author, prefix mention if not present
    let finalContent = trimmed;
    if (replyTargetUser && replyTargetUser.username !== comment.user.username) {
      const mentionPrefix = `@${replyTargetUser.username} `;
      if (!finalContent.startsWith(mentionPrefix)) {
        finalContent = `${mentionPrefix}${finalContent}`;
      }
    }

    setSubmittingReply(true);
    const success = await onReply(comment.id, finalContent, replyTargetUser?.username);
    setSubmittingReply(false);

    if (success) {
      setReplyContent('');
      setIsReplying(false);
      setReplyTargetUser(null);
    }
  };

  const handleDeleteClick = () => {
    if (onDeleteRequest) {
      onDeleteRequest({
        id: comment.id,
        content: comment.content,
        isReply: false,
        repliesCount: comment.repliesCount || comment.replies?.length || 0,
        user: comment.user,
      });
    } else if (onDelete) {
      onDelete(comment.id);
    }
  };

  const handleStartReply = (targetUser?: { displayName: string; username: string }) => {
    setReplyTargetUser(targetUser || { displayName: comment.user.displayName, username: comment.user.username });
    setIsReplying(true);
  };

  const totalLoadedReplies = comment.replies?.length || 0;
  const totalRepliesCount = comment.repliesCount || totalLoadedReplies;
  const remainingReplies = Math.max(0, totalRepliesCount - totalLoadedReplies);

  return (
    <div className="space-y-3">
      {/* Main Comment Row */}
      <div className="flex gap-3 group">
        {isDeleted ? (
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
            <UserX className="w-4 h-4" />
          </div>
        ) : (
          <Link
            href={`/u/${comment.user.username}`}
            className="shrink-0 transition-opacity hover:opacity-85"
            title={`Hồ sơ của ${comment.user.displayName}`}
          >
            <img
              src={comment.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
              alt={comment.user.displayName}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border mt-0.5"
            />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-zinc-100/80 dark:bg-secondary/40 p-3 border border-zinc-200/60 dark:border-border/60 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {isDeleted ? (
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 italic">
                    Thành viên Spaces
                  </span>
                ) : (
                  <>
                    <Link
                      href={`/u/${comment.user.username}`}
                      className="text-xs font-bold text-zinc-900 dark:text-foreground hover:underline truncate"
                    >
                      {comment.user.displayName}
                    </Link>
                    <span className="text-[10px] text-zinc-500 dark:text-muted-foreground truncate">
                      @{comment.user.username}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 text-[10px] text-zinc-400 dark:text-muted-foreground">
                <RelativeTime
                  createdAt={comment.createdAt}
                  updatedAt={comment.updatedAt}
                  showBothIfEdited
                  locale="vi"
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
            ) : isDeleted ? (
              <p className="text-xs italic text-zinc-400 dark:text-zinc-500 py-1">
                Bình luận này đã bị xóa.
              </p>
            ) : (
              <p className="text-xs text-zinc-800 dark:text-foreground/90 whitespace-pre-line leading-relaxed break-words">
                <FormattedCommentContent content={comment.content} />
              </p>
            )}
          </div>

          {/* Action Row: Reaction, Reply, Edit, Delete */}
          {!isEditing && (
            <div className="flex items-center gap-3.5 px-1 mt-1 text-[11px] text-zinc-500 dark:text-muted-foreground select-none">
              {/* Reaction Button */}
              {!isDeleted && (
                <button
                  type="button"
                  onClick={() => onToggleReaction(comment.id, null)}
                  className={`inline-flex items-center gap-1 font-semibold cursor-pointer transition-colors ${
                    hasReacted
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'hover:text-zinc-900 dark:hover:text-foreground'
                  }`}
                  title={hasReacted ? 'Bỏ thích' : 'Thích bình luận'}
                >
                  <Heart
                    className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                      hasReacted
                        ? 'fill-rose-500 text-rose-500'
                        : 'stroke-current'
                    }`}
                  />
                  <span>
                    {comment.reactionsCount > 0 ? comment.reactionsCount : 'Thích'}
                  </span>
                </button>
              )}

              {/* Reply Button */}
              <button
                type="button"
                onClick={() => {
                  if (isReplying) {
                    setIsReplying(false);
                    setReplyTargetUser(null);
                  } else {
                    handleStartReply();
                  }
                }}
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-foreground font-semibold cursor-pointer transition-colors"
              >
                <Reply className="w-3 h-3" />
                <span>Trả lời</span>
              </button>

              {/* Author Actions: Edit & Delete */}
              {isAuthor && !isDeleted && (
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
            <div className="mt-2.5 space-y-1.5 animate-in fade-in duration-150">
              {replyTargetUser && replyTargetUser.username !== comment.user.username && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[10px] text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                  <span>Đang trả lời <strong>@{replyTargetUser.username}</strong></span>
                  <button
                    type="button"
                    onClick={() => setReplyTargetUser({ displayName: comment.user.displayName, username: comment.user.username })}
                    className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200 ml-1 cursor-pointer"
                    title="Hủy gắn thẻ trả lời"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendReply} className="flex items-start gap-2">
                <CornerDownRight className="w-4 h-4 text-zinc-400 shrink-0 mt-2 ml-1" />
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={
                      replyTargetUser
                        ? `Trả lời @${replyTargetUser.username}...`
                        : `Trả lời @${comment.user.username}...`
                    }
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-card border border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                  />
                  <button
                    type="submit"
                    disabled={submittingReply || !replyContent.trim()}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0 transition-opacity shadow-xs"
                  >
                    {submittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Gửi'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Nested Replies (Controlled 1-level hierarchy) */}
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
                  onToggleReaction={onToggleReaction}
                  onReplyToUser={(user) => handleStartReply(user)}
                />
              ))}

              {/* Load More Replies Button */}
              {remainingReplies > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onLoadMoreReplies?.(comment.id)}
                    disabled={isLoadingReplies}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors group/more"
                  >
                    {isLoadingReplies ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CornerDownRight className="w-3.5 h-3.5 text-zinc-400 group-hover/more:text-indigo-500" />
                    )}
                    <span>
                      Xem thêm {remainingReplies} câu trả lời
                    </span>
                  </button>
                </div>
              )}
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
  onToggleReaction: (commentId: string, parentId?: string | null) => Promise<void>;
  onReplyToUser: (user: { displayName: string; username: string }) => void;
}

function ReplyItem({
  reply,
  currentUserId,
  onEdit,
  onDeleteRequest,
  onDelete,
  onToggleReaction,
  onReplyToUser,
}: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [savingEdit, setSavingEdit] = useState(false);

  const isReplyAuthor = Boolean(currentUserId && currentUserId === reply.userId);
  const isDeleted = Boolean(reply.deletedAt);
  const hasReacted = reply.userReaction === 'HEART';

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
      {isDeleted ? (
        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
          <UserX className="w-3 h-3" />
        </div>
      ) : (
        <Link
          href={`/u/${reply.user.username}`}
          className="shrink-0 transition-opacity hover:opacity-85"
          title={`Hồ sơ của ${reply.user.displayName}`}
        >
          <img
            src={reply.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
            alt={reply.user.displayName}
            className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-border mt-0.5"
          />
        </Link>
      )}

      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-zinc-100/60 dark:bg-secondary/30 p-2.5 border border-zinc-200/50 dark:border-border/50 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {isDeleted ? (
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 italic">
                  Thành viên Spaces
                </span>
              ) : (
                <>
                  <Link
                    href={`/u/${reply.user.username}`}
                    className="text-[11px] font-bold text-zinc-900 dark:text-foreground hover:underline truncate"
                  >
                    {reply.user.displayName}
                  </Link>
                  <span className="text-[10px] text-zinc-500 dark:text-muted-foreground truncate">
                    @{reply.user.username}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[9px] text-zinc-400 dark:text-muted-foreground">
              <RelativeTime
                createdAt={reply.createdAt}
                updatedAt={reply.updatedAt}
                showBothIfEdited
                locale="vi"
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
          ) : isDeleted ? (
            <p className="text-xs italic text-zinc-400 dark:text-zinc-500 py-0.5">
              Câu trả lời này đã bị xóa.
            </p>
          ) : (
            <p className="text-xs text-zinc-800 dark:text-foreground/90 whitespace-pre-line leading-relaxed break-words">
              <FormattedCommentContent content={reply.content} />
            </p>
          )}
        </div>

        {/* Reply Action Buttons: React, Reply, Edit, Delete */}
        {!isEditing && (
          <div className="flex items-center gap-2.5 px-1 mt-0.5 text-[10px] text-zinc-500 dark:text-muted-foreground select-none">
            {/* Reaction on reply */}
            {!isDeleted && (
              <button
                type="button"
                onClick={() => onToggleReaction(reply.id, reply.parentId)}
                className={`inline-flex items-center gap-0.5 font-semibold cursor-pointer transition-colors ${
                  hasReacted
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'hover:text-zinc-900 dark:hover:text-foreground'
                }`}
                title={hasReacted ? 'Bỏ thích' : 'Thích câu trả lời'}
              >
                <Heart
                  className={`w-3 h-3 transition-transform active:scale-125 ${
                    hasReacted
                      ? 'fill-rose-500 text-rose-500'
                      : 'stroke-current'
                  }`}
                />
                <span>
                  {reply.reactionsCount > 0 ? reply.reactionsCount : 'Thích'}
                </span>
              </button>
            )}

            {/* Reply to reply author */}
            {!isDeleted && (
              <button
                type="button"
                onClick={() => onReplyToUser(reply.user)}
                className="inline-flex items-center gap-0.5 hover:text-zinc-900 dark:hover:text-foreground font-semibold cursor-pointer transition-colors"
              >
                <Reply className="w-2.5 h-2.5" />
                <span>Trả lời</span>
              </button>
            )}

            {/* Edit / Delete for reply author */}
            {isReplyAuthor && !isDeleted && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(reply.content);
                  }}
                  className="inline-flex items-center gap-0.5 hover:text-zinc-900 dark:hover:text-foreground font-medium cursor-pointer transition-colors opacity-75 group-hover/reply:opacity-100"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Sửa</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="inline-flex items-center gap-0.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer transition-colors opacity-75 group-hover/reply:opacity-100"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>Xóa</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
