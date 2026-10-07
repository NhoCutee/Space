'use client';

import { useState } from 'react';
import { Bookmark, MessageSquare } from 'lucide-react';
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
}: DropDetailInteractionsProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savesCount, setSavesCount] = useState(initialSavesCount);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  return (
    <div className="space-y-6">
      {/* Primary Interaction Action Bar */}
      <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between gap-3">
        {/* Left: Reaction */}
        <ReactionButton
          dropId={dropId}
          initialCount={reactionsCount}
          initialReacted={userReacted}
          size="md"
          showLabel
        />

        {/* Right: Save to Collection & Comment Count */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            aria-label="Lưu vào bộ sưu tập"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Lưu ({savesCount})</span>
          </button>

          <a
            href="#discussion"
            aria-label="Xem bình luận"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{commentsCount}</span>
          </a>
        </div>
      </div>

      {/* Discussion Thread Section */}
      <div id="discussion" className="pt-2">
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
