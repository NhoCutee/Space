import { Sparkles, Users, Flame, Compass, Heart } from 'lucide-react';
import { ExplainableReason } from '@/lib/recommendations/scoring';

interface ExplainableBadgeProps {
  reason: ExplainableReason;
  className?: string;
}

export function ExplainableBadge({ reason, className = '' }: ExplainableBadgeProps) {
  const getIcon = () => {
    switch (reason.type) {
      case 'interest':
        return <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case 'joined_space':
        return <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'trending':
        return <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'popular':
        return <Heart className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />;
      default:
        return <Compass className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />;
    }
  };

  const getStyle = () => {
    switch (reason.type) {
      case 'interest':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      case 'joined_space':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'trending':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'popular':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30';
      default:
        return 'bg-secondary/80 text-muted-foreground border-border/80';
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 ${getStyle()} ${className}`}
      title={reason.label}
    >
      {getIcon()}
      <span className="whitespace-nowrap leading-none">{reason.label}</span>
    </div>
  );
}
