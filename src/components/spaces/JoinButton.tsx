'use client';

import { useState } from 'react';
import { toggleJoinSpace } from '@/actions/spaces';
import { Check, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface JoinButtonProps {
  spaceId: string;
  initialJoined: boolean;
  spaceName?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  initialCount?: number;
  className?: string;
  onCountChange?: (newCount: number, isJoined: boolean) => void;
}

export function JoinButton({
  spaceId,
  initialJoined,
  spaceName = 'Space',
  size = 'md',
  showCount = false,
  initialCount = 0,
  className = '',
  onCountChange,
}: JoinButtonProps) {
  const [joined, setJoined] = useState(initialJoined);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic toggle
    const nextState = !joined;
    const nextCount = nextState ? count + 1 : Math.max(0, count - 1);
    setJoined(nextState);
    setCount(nextCount);
    if (onCountChange) onCountChange(nextCount, nextState);

    setLoading(true);

    try {
      const res = await toggleJoinSpace(spaceId);
      if (!res.success) {
        // Revert on server error
        setJoined(!nextState);
        setCount(count);
        if (onCountChange) onCountChange(count, !nextState);
        toast.error(res.error || 'Failed to update membership');
        return;
      }

      setJoined(res.isJoined);
      setCount(res.membersCount);
      if (onCountChange) onCountChange(res.membersCount, res.isJoined);

      if (res.isJoined) {
        toast.success(`Joined ${spaceName}! Drops will appear in your feed.`);
      } else {
        toast.info(`Left ${spaceName}`);
      }
    } catch {
      // Revert on network exception
      setJoined(!nextState);
      setCount(count);
      if (onCountChange) onCountChange(count, !nextState);
      toast.error('Network error updating membership');
    } finally {
      setLoading(false);
    }
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-4 py-1.5 text-xs',
    lg: 'px-5 py-2.5 text-sm font-semibold',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${sizeStyles[size]} ${
        joined
          ? 'bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive border border-border/80'
          : 'bg-foreground text-background hover:opacity-90 shadow-sm'
      } ${className}`}
      aria-label={joined ? `Leave ${spaceName}` : `Join ${spaceName}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : joined ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
          <span>Joined</span>
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Join Space</span>
        </>
      )}

      {showCount && (
        <span className="text-[11px] opacity-75 font-normal ml-0.5 border-l border-current/20 pl-1.5">
          {count}
        </span>
      )}
    </button>
  );
}
