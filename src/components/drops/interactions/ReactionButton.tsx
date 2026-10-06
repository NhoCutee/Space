'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toggleDropReaction } from '@/actions/reactions';
import { toast } from 'sonner';

interface ReactionButtonProps {
  dropId: string;
  initialReacted?: boolean;
  initialCount?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ReactionButton({
  dropId,
  initialReacted = false,
  initialCount = 0,
  size = 'md',
  showLabel = false,
}: ReactionButtonProps) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Previous state for rollback
    const prevReacted = reacted;
    const prevCount = count;

    // Optimistic update
    const nextReacted = !prevReacted;
    const nextCount = nextReacted ? prevCount + 1 : Math.max(0, prevCount - 1);

    setReacted(nextReacted);
    setCount(nextCount);

    startTransition(async () => {
      try {
        const res = await toggleDropReaction(dropId);
        if (!res.success) {
          // Rollback on server error
          setReacted(prevReacted);
          setCount(prevCount);
          toast.error(res.error || 'Không thể cập nhật lượt thích');
          return;
        }

        // Synchronize with authoritative server count if returned
        if (typeof res.reactionsCount === 'number') {
          setCount(res.reactionsCount);
        }
        if (typeof res.reacted === 'boolean') {
          setReacted(res.reacted);
        }
      } catch {
        // Rollback on network failure
        setReacted(prevReacted);
        setCount(prevCount);
        toast.error('Lỗi kết nối mạng khi cập nhật thích');
      }
    });
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={reacted ? 'Bỏ thích' : 'thích tác phẩm'}
      className={`inline-flex items-center gap-1.5 rounded-full transition-all cursor-pointer font-medium select-none ${
        isSmall
          ? 'px-2.5 py-1 text-xs'
          : 'px-3.5 py-1.5 text-xs'
      } ${
        reacted
          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/80'
      } ${isPending ? 'opacity-80' : 'active:scale-95'}`}
    >
      <Heart
        className={`transition-transform duration-200 ${
          isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'
        } ${
          reacted
            ? 'fill-rose-500 text-rose-500 scale-110'
            : 'text-muted-foreground group-hover:text-foreground'
        }`}
      />
      <span className="font-semibold">{count}</span>
      {showLabel && <span className="hidden sm:inline">thích</span>}
    </button>
  );
}
