'use client';

import { useState } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { CommentWithReplies } from '@/actions/comments';
import { CommentThread } from '@/components/drops/interactions/comments/CommentThread';

interface SpaceCommentsSectionProps {
  spaceId: string;
  spaceSlug: string;
  spaceName: string;
  initialComments: CommentWithReplies[];
  currentUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  initialCommentsCount: number;
}

export function SpaceCommentsSection({
  spaceId,
  spaceSlug,
  spaceName,
  initialComments,
  currentUser,
  initialCommentsCount,
}: SpaceCommentsSectionProps) {
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  return (
    <section
      data-space-slug={spaceSlug}
      className="rounded-3xl border border-zinc-200/80 dark:border-border/60 bg-zinc-50/50 dark:bg-card/40 p-5 sm:p-7 shadow-xs"
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/60 dark:border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-foreground tracking-tight">
              Thảo luận & Bình luận
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-muted-foreground">
            Không gian chia sẻ cảm nghĩ, góc nhìn và trao đổi cùng các thành viên tại{' '}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{spaceName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-secondary border border-zinc-200/80 dark:border-border/60 text-zinc-700 dark:text-foreground shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{commentsCount} {commentsCount === 1 ? 'bình luận' : 'bình luận'}</span>
          </span>
        </div>
      </div>

      <CommentThread
        spaceId={spaceId}
        initialComments={initialComments}
        currentUserId={currentUser?.id}
        currentUsername={currentUser?.username}
        currentAvatarUrl={currentUser?.avatarUrl}
        onCommentsCountChange={setCommentsCount}
        title="Bình luận không gian"
        placeholder={`Bình luận về không gian ${spaceName}, đặt câu hỏi hoặc chia sẻ cảm nghĩ...`}
      />
    </section>
  );
}
