import { getDropById } from '@/actions/drops';
import { getDropComments } from '@/actions/comments';
import { getDropReactionState } from '@/actions/reactions';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Cpu,
  ArrowLeft,
  Calendar,
  Compass,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { DropDetailInteractions } from '@/components/drops/DropDetailInteractions';

export const dynamic = 'force-dynamic';

interface DropPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DropDetailPage({ params }: DropPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [drop, initialComments, reactionState] = await Promise.all([
    getDropById(id),
    getDropComments(id),
    getDropReactionState(id),
  ]);

  if (!drop) {
    notFound();
  }

  const specsList = Object.entries(drop.parsedSpecs || {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Breadcrumb Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/s/${drop.space.slug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to {drop.space.name}</span>
        </Link>

        <span className="text-[11px] text-zinc-400 dark:text-muted-foreground uppercase tracking-wider">
          Drop Detail
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Media Gallery (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {drop.media.map((media, idx) => (
            <div
              key={media.id || idx}
              className="relative w-full rounded-3xl overflow-hidden border border-zinc-200/90 dark:border-border/80 bg-zinc-100 dark:bg-muted shadow-xs"
              style={{
                aspectRatio: `${media.width || 1200} / ${media.height || 800}`,
              }}
            >
              <img
                src={media.url}
                alt={`${drop.title} - Asset ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {drop.media.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-background/80 backdrop-blur-md text-zinc-900 dark:text-foreground border border-zinc-200/80 dark:border-border/60">
                  {idx + 1} of {drop.media.length}
                </div>
              )}
            </div>
          ))}

          {/* Color Palette Display if available */}
          {drop.parsedPalette && drop.parsedPalette.length > 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-zinc-200/90 dark:border-border/80 flex items-center justify-between shadow-xs">
              <span className="text-xs font-semibold text-zinc-500 dark:text-muted-foreground uppercase tracking-wider">
                Aesthetic Palette
              </span>
              <div className="flex items-center gap-1.5">
                {drop.parsedPalette.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border border-zinc-200 dark:border-border/60 shadow-inner"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Context, Author, Specs, Actions & Discussion (4 cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <div className="rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white dark:bg-card p-6 shadow-xs space-y-5">
            {/* Space Destination Header */}
            <Link
              href={`/s/${drop.space.slug}`}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 border border-zinc-200 dark:bg-secondary dark:hover:bg-secondary/80 dark:text-foreground dark:border-border/70 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>{drop.space.name}</span>
            </Link>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-foreground leading-snug">
              {drop.title}
            </h1>

            {/* Author Profile */}
            <div className="pt-2 border-t border-zinc-100 dark:border-border/50 flex items-center gap-3">
              <img
                src={drop.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
                alt={drop.user.displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-foreground truncate">
                  {drop.user.displayName}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-muted-foreground truncate">
                  @{drop.user.username}
                </div>
              </div>
            </div>

            {/* Location & Time Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-muted-foreground pt-1 border-t border-zinc-100 dark:border-border/50">
              {drop.locationName && (
                <div className="flex items-center gap-1 text-zinc-900 dark:text-foreground font-medium">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-muted-foreground" />
                  <span>{drop.locationName}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-muted-foreground" />
                <span>{timeAgo(drop.createdAt)}</span>
              </div>
            </div>

            {/* Story / Narrative Content */}
            {drop.content && (
              <div className="pt-2 border-t border-zinc-100 dark:border-border/50 text-xs sm:text-sm text-zinc-700 dark:text-foreground/90 leading-relaxed whitespace-pre-line">
                {drop.content}
              </div>
            )}

            {/* Structured Specifications */}
            {specsList.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 dark:border-border/50 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Technical & Gear Specs</span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {specsList.map(([key, value], idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-zinc-50/70 dark:bg-secondary/50 border border-zinc-200/60 dark:border-border/60 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-zinc-500 dark:text-muted-foreground">{key}</span>
                      <span className="font-bold text-zinc-900 dark:text-foreground text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase 4 Live Social Interactions & Comments */}
            <div className="pt-4 border-t border-zinc-100 dark:border-border/60">
              <DropDetailInteractions
                dropId={drop.id}
                dropTitle={drop.title}
                reactionsCount={drop.reactionsCount}
                commentsCount={drop.commentsCount}
                savesCount={drop.savesCount}
                userReacted={reactionState.reacted}
                currentUser={user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } : null}
                initialComments={initialComments}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
