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
      <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-secondary/40 border border-zinc-200/80 dark:border-border/60 flex items-center justify-between gap-3">
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
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save ({savesCount})</span>
          </button>

          <a
            href="#discussion"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-secondary/70 dark:hover:bg-secondary text-zinc-700 dark:text-foreground border border-zinc-200/60 dark:border-border/60 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
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
