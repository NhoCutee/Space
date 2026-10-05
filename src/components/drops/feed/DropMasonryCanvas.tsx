import { DropCard, DropCardProps } from './DropCard';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface DropMasonryCanvasProps {
  drops: DropCardProps['drop'][];
  showSpaceBadge?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  spaceSlug?: string;
}

export function DropMasonryCanvas({
  drops,
  showSpaceBadge = false,
  emptyTitle = 'No Drops published yet',
  emptyDescription = 'Be the first to share visual inspiration here.',
  spaceSlug,
}: DropMasonryCanvasProps) {
  if (drops.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card/40 max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 text-muted-foreground">
          <ImageIcon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-foreground">{emptyTitle}</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {emptyDescription}
        </p>
        <div className="mt-6">
          <Link
            href={spaceSlug ? `/create?space=${spaceSlug}` : '/create'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create the first Drop</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* CSS Masonry Multi-Column Canvas */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-6 [column-fill:_balance]">
        {drops.map((drop) => (
          <DropCard
            key={drop.id}
            drop={drop}
            showSpaceBadge={showSpaceBadge}
          />
        ))}
      </div>
    </div>
  );
}
