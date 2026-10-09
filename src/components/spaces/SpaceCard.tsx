import Link from 'next/link';
import { Users, Sparkles } from 'lucide-react';
import { JoinButton } from './JoinButton';
import { getMediaVariantUrl } from '@/lib/media/responsive';

interface SpaceCardProps {
  space: {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: string;
    coverImageUrl: string;
    themeColor: string;
    membersCount: number;
    dropsCount: number;
    drops?: Array<{
      media: Array<{ url: string; variants?: string | null }>;
    }>;
  };
  initialJoined?: boolean;
}

export function SpaceCard({ space, initialJoined = false }: SpaceCardProps) {
  const previewImages = space.drops
    ?.flatMap((d) => d.media.map((m) => getMediaVariantUrl(m, 'thumb', m.url)))
    .slice(0, 3) || [];

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-border/70 bg-card hover:border-foreground/30 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1">
      {/* Visual Top Preview */}
      <Link href={`/s/${space.slug}`} className="block relative aspect-[16/9] overflow-hidden bg-muted">
        {previewImages.length >= 3 ? (
          <div className="grid grid-cols-3 h-full gap-0.5">
            {previewImages.map((url, i) => (
              <div key={i} className="relative h-full overflow-hidden">
                <img
                  src={url}
                  alt={space.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        ) : (
          <img
            src={space.coverImageUrl}
            alt={space.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-background/80 backdrop-blur-md text-foreground border border-border/60">
            {space.category}
          </span>
        </div>
      </Link>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/s/${space.slug}`} className="block">
            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
              {space.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {space.description}
            </p>
          </Link>
        </div>

        {/* Footer Meta & Join Button */}
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{space.membersCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{space.dropsCount} drops</span>
            </div>
          </div>

          <JoinButton
            spaceId={space.id}
            initialJoined={initialJoined}
            spaceName={space.name}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
