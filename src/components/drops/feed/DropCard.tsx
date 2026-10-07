'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Cpu, ImageOff, MessageSquare, Bookmark } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { ReactionButton } from '../interactions/ReactionButton';
import { SaveToCollectionModal } from '../interactions/SaveToCollectionModal';
import { UserIdentity } from '@/components/user';

export interface DropCardProps {
  drop: {
    id: string;
    title: string;
    locationName?: string | null;
    createdAt: Date | string;
    specs?: string | null;
    parsedSpecs?: Record<string, string>;
    reactionsCount?: number;
    commentsCount?: number;
    savesCount?: number;
    userReacted?: boolean;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    };
    space?: {
      id: string;
      name: string;
      slug: string;
      themeColor?: string;
    };
    media: Array<{
      id?: string;
      url: string;
      width: number;
      height: number;
      aspectRatio: number;
    }>;
  };
  showSpaceBadge?: boolean;
}

export function DropCard({ drop, showSpaceBadge = false }: DropCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savesCount, setSavesCount] = useState(drop.savesCount || 0);

  const primaryMedia = drop.media[0] || {
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
  };

  const specsList = drop.parsedSpecs
    ? Object.entries(drop.parsedSpecs)
    : [];

  const firstSpec = specsList.length > 0 ? specsList[0] : null;

  return (
    <>
      <article className="break-inside-avoid mb-4 sm:mb-6 group rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-border/80 bg-white dark:bg-card hover:border-zinc-400 dark:hover:border-foreground/30 transition-all duration-300 shadow-xs hover:shadow-lg flex flex-col justify-between">
        {/* Clickable Drop media and title */}
        <Link
          href={`/drop/${drop.id}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          {/* Media Container preserving exact aspect ratio */}
          <div
            className="relative w-full bg-zinc-100 dark:bg-muted overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: `${primaryMedia.width || 1200} / ${primaryMedia.height || 800}`,
            }}
          >
            {imageError ? (
              <div className="flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
                <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">Image unavailable</span>
              </div>
            ) : (
              <img
                src={primaryMedia.url}
                alt={drop.title}
                loading="lazy"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
              />
            )}

            {/* Top Overlays */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              {showSpaceBadge && drop.space && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-background/90 backdrop-blur-md text-zinc-900 dark:text-foreground border border-zinc-200/80 dark:border-border/60 shadow-xs">
                  {drop.space.name}
                </span>
              )}
              {drop.media.length > 1 && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 dark:bg-background/80 backdrop-blur-md text-zinc-900 dark:text-foreground border border-zinc-200/80 dark:border-border/60">
                  1/{drop.media.length}
                </span>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-3.5 sm:p-4 pb-0 sm:pb-0">
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {drop.title}
            </h3>

            {/* Specs / Gear Pill if available */}
            {firstSpec && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-secondary text-zinc-600 dark:text-muted-foreground max-w-full truncate border border-zinc-200/50 dark:border-transparent">
                <Cpu className="w-3 h-3 shrink-0 text-indigo-500 dark:text-indigo-400" />
                <span className="truncate">
                  <strong className="text-zinc-900 dark:text-foreground">{firstSpec[0]}:</strong> {firstSpec[1]}
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Card Footer: Creator info, Location & Actions */}
        <div className="p-3.5 sm:p-4 pt-2">
          {/* Creator info & Location row */}
          <div className="mt-2 pt-2.5 border-t border-zinc-100 dark:border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <UserIdentity
              user={drop.user}
              variant="compact"
              size="xs"
              className="min-w-0 max-w-[65%]"
            />

            <div className="flex items-center gap-2 shrink-0 text-[11px]">
              {drop.locationName && (
                <span className="hidden sm:inline-flex items-center gap-0.5 text-muted-foreground truncate max-w-[90px]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{drop.locationName.split(',')[0]}</span>
                </span>
              )}
              <span>{timeAgo(drop.createdAt)}</span>
            </div>
          </div>

          {/* Social Interactions Action Bar */}
          <div className="mt-2.5 pt-2 border-t border-zinc-100/80 dark:border-border/40 flex items-center justify-between">
            {/* Left: Reaction */}
            <ReactionButton
              dropId={drop.id}
              initialCount={drop.reactionsCount || 0}
              initialReacted={drop.userReacted || false}
              size="sm"
            />

            {/* Right: Comments Count & Save Button */}
            <div className="flex items-center gap-1.5">
              <div
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-500 dark:text-muted-foreground rounded-full hover:bg-zinc-100 dark:hover:bg-secondary/50 transition-colors"
                title={`${drop.commentsCount || 0} bình luận`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{drop.commentsCount || 0}</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSaveModalOpen(true);
                }}
                title="Lưu vào Bộ sưu tập"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:text-foreground bg-zinc-100 hover:bg-zinc-200/80 dark:bg-secondary/70 dark:hover:bg-secondary rounded-full border border-zinc-200/60 dark:border-border/60 transition-all cursor-pointer active:scale-95"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{savesCount}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Save Modal */}
      <SaveToCollectionModal
        dropId={drop.id}
        dropTitle={drop.title}
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSaveStateChange={(change) => {
          setSavesCount((prev) => Math.max(0, prev + change));
        }}
      />
    </>
  );
}
