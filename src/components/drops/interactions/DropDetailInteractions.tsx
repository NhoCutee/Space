'use client';

import { useState } from 'react';
import { Bookmark, MessageSquare, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ReactionButton } from './ReactionButton';
import { SaveToCollectionModal } from './SaveToCollectionModal';
import { CommentThread } from './comments/CommentThread';
import { CommentWithReplies } from '@/actions/comments';

interface DropDetailInteractionsProps {
  dropId: string;
  dropTitle: string;
  reactionsCount: number;
  commentsCount: number;
  savesCount: number;
  userReacted: boolean;
  currentUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  initialComments: CommentWithReplies[];
  children?: React.ReactNode;
}

export function DropDetailInteractions({
  dropId,
  dropTitle,
  reactionsCount,
  commentsCount: initialCommentsCount,
  savesCount: initialSavesCount,
  userReacted,
  currentUser,
  initialComments,
  children,
}: DropDetailInteractionsProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savesCount, setSavesCount] = useState(initialSavesCount);
  const [copiedLink, setCopiedLink] = useState(false);

  // Compute exact count from initialComments so the comment badge next to Save matches exactly
  const initialComputedCount = initialComments.length > 0
    ? initialComments.reduce(
        (acc, c) => acc + (c.deletedAt ? 0 : 1) + (c.replies?.filter((r) => !r.deletedAt).length || 0),
        0
      )
    : initialCommentsCount;
  const [commentsCount, setCommentsCount] = useState(
    initialComments.length > 0 ? initialComputedCount : initialCommentsCount
  );

  const handleCopyLink = () => {
    try {
      const url = `${window.location.origin}/drop/${dropId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success('Đã sao chép liên kết tác phẩm');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Không thể sao chép liên kết');
    }
  };

  return (
    <div className="space-y-5">
      {/* Primary Interaction Action Bar (Instagram / Facebook Style) */}
      <div className="py-2 px-3 sm:px-4 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between gap-2 shadow-2xs">
        {/* Left: Like, Comment, Share */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ReactionButton
            dropId={dropId}
            initialCount={reactionsCount}
            initialReacted={userReacted}
            size="md"
            showLabel
          />

          <a
            href="#discussion"
            aria-label="Xem bình luận"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{commentsCount}</span>
          </a>

          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Chia sẻ tác phẩm"
            title="Sao chép liên kết"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="hidden sm:inline">Chia sẻ</span>
          </button>
        </div>

        {/* Right: Save to Collection */}
        <button
          type="button"
          onClick={() => setIsSaveModalOpen(true)}
          aria-label="Lưu vào bộ sưu tập"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Lưu ({savesCount})</span>
        </button>
      </div>

      {/* Post body & content (Title, Story, Palette, Specs) */}
      {children && <div className="space-y-4 pt-0.5">{children}</div>}

      {/* Discussion Thread Section */}
      <div id="discussion" className="pt-3 border-t border-border/60">
        <CommentThread
          dropId={dropId}
          initialComments={initialComments}
          currentUserId={currentUser?.id}
          currentUsername={currentUser?.username}
          currentAvatarUrl={currentUser?.avatarUrl}
          onCommentsCountChange={setCommentsCount}
        />
      </div>

      {/* Save Modal */}
      <SaveToCollectionModal
        dropId={dropId}
        dropTitle={dropTitle}
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSaveStateChange={(change) => {
          setSavesCount((prev) => Math.max(0, prev + change));
        }}
      />
    </div>
  );
}

