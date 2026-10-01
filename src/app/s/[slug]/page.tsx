import { getSpaceBySlug } from '@/actions/spaces';
import { SpaceMasthead } from '@/components/spaces/SpaceMasthead';
import { DropMasonryCanvas } from '@/components/drops/DropMasonryCanvas';
import { notFound } from 'next/navigation';
import { Sparkles, Image as ImageIcon, Users, Info } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SpacePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SpacePage({ params }: SpacePageProps) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);

  if (!space) {
    notFound();
  }

  const drops = space.drops || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Space Masthead */}
      <SpaceMasthead
        space={space}
        initialJoined={space.isJoined}
        userRole={space.userRole}
      />

      {/* Membership State Banner */}
      {!space.isJoined ? (
        <div className="mb-8 p-4 rounded-2xl bg-secondary/50 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              You are exploring as a guest. Join{' '}
              <strong className="text-foreground">{space.name}</strong> to contribute Drops and receive community updates.
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider shrink-0 font-medium">
            Open Community
          </span>
        </div>
      ) : (
        <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              You are a member of <strong className="font-bold">{space.name}</strong>. Drops from this space are active in your personalized feed.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>
      )}

      {/* Visual Canvas Area with Preserved Aspect Ratio Masonry */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span>Space Drops</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-muted-foreground">
              {drops.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Feed:</span>
            <span className="font-semibold text-foreground bg-secondary px-2.5 py-1 rounded-full">
              Latest Contributions
            </span>
          </div>
        </div>

        {/* Masonry Canvas */}
        <DropMasonryCanvas
          drops={drops}
          spaceSlug={space.slug}
          emptyTitle={`No Drops published to ${space.name} yet`}
          emptyDescription="Be the first to drop visual inspiration into this community."
        />
      </div>

      {/* Space Community Footer */}
      <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>
            Curated and sustained by <strong className="text-foreground">{space.membersCount}</strong> visual enthusiasts.
          </span>
        </div>
        <Link
          href="/explore"
          className="text-foreground font-semibold hover:underline underline-offset-4"
        >
          ← Discover other Spaces
        </Link>
      </div>
    </div>
  );
}
