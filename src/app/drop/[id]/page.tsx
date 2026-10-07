import { Metadata } from 'next';
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
  Compass,
  Calendar,
} from 'lucide-react';
import { DropDetailInteractions, DropCanvasViewer } from '@/components/drops';
import { RelativeTime } from '@/components/ui/RelativeTime';

export const dynamic = 'force-dynamic';

interface DropPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: DropPageProps): Promise<Metadata> {
  const { id } = await params;
  const drop = await getDropById(id);

  if (!drop) {
    return {
      title: 'Tác phẩm không tìm thấy | Spaces',
    };
  }

  return {
    title: `${drop.title} — ${drop.space.name} | Spaces`,
    description:
      drop.content?.slice(0, 160) ||
      `Tác phẩm thị giác thuộc Không gian ${drop.space.name} trên Spaces — The Visual Commons Atelier.`,
    openGraph: {
      title: drop.title,
      description: drop.content || undefined,
      images: drop.media[0]?.url ? [drop.media[0].url] : [],
    },
  };
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
  const realCommentsCount = initialComments.reduce(
    (acc, c) => acc + (c.deletedAt ? 0 : 1) + (c.replies?.filter((r) => !r.deletedAt).length || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Curatorial Breadcrumb Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/s/${drop.space.slug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại Không gian {drop.space.name}</span>
        </Link>

        <Link
          href={`/s/${drop.space.slug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{drop.space.name}</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Media Gallery & Aesthetic Palette (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <DropCanvasViewer
            media={drop.media}
            palette={drop.parsedPalette}
            dropTitle={drop.title}
            dropId={drop.id}
          />
        </div>

        {/* Right Column: Curatorial Context, Author Studio, Specs & Discourse (4 cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
            {/* Space Provenance Chip */}
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/s/${drop.space.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-secondary hover:bg-secondary/80 text-foreground border border-border/70 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{drop.space.name}</span>
              </Link>

              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {drop.space.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-snug">
              {drop.title}
            </h1>

            {/* Author Studio Profile */}
            <div className="pt-3 border-t border-border/50 flex items-center gap-3">
              <img
                src={drop.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
                alt={drop.user.displayName}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate">
                  {drop.user.displayName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{drop.user.username}
                </div>
              </div>
            </div>

            {/* Location & Time Metadata */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground pt-3 border-t border-border/50">
              {drop.locationName && (
                <div className="flex items-center gap-1 text-foreground font-medium">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{drop.locationName}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <RelativeTime createdAt={drop.createdAt} />
              </div>
            </div>

            {/* Narrative Story / Curatorial Notes */}
            {drop.content && (
              <div className="pt-3 border-t border-border/50 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {drop.content}
              </div>
            )}

            {/* Structured Specifications (Thông số Kỹ thuật & Thiết bị) */}
            {specsList.length > 0 && (
              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Thông số Kỹ thuật & Thiết bị</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {specsList.map(([key, value], idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-muted-foreground">{key}</span>
                      <span className="font-bold text-foreground text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Social Interactions & Comment Thread */}
            <div className="pt-4 border-t border-border/60">
              <DropDetailInteractions
                dropId={drop.id}
                dropTitle={drop.title}
                reactionsCount={drop.reactionsCount}
                commentsCount={realCommentsCount}
                savesCount={drop.savesCount}
                userReacted={reactionState.reacted}
                currentUser={
                  user
                    ? {
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        avatarUrl: user.avatarUrl,
                      }
                    : null
                }
                initialComments={initialComments}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
