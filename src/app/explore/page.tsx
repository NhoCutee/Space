import { getSpaces } from '@/actions/spaces';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { CategoryFilterBar } from '@/components/explore/CategoryFilterBar';
import { CreateSpaceButton } from '@/components/explore/CreateSpaceButton';
import { Compass, Sparkles, FolderSearch } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface ExplorePageProps {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { category, q } = await searchParams;
  const spaces = await getSpaces(category, q);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>Space Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Discover Spaces
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
            Visual communities dedicated to specific topics, aesthetics, and crafts.
            Join spaces that match your interests to populate your personal feed.
          </p>
        </div>

        <CreateSpaceButton />
      </div>

      {/* Interactive Category & Search Bar */}
      <CategoryFilterBar />

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {spaces.length} {spaces.length === 1 ? 'Space' : 'Spaces'} available
          </span>
        </span>
      </div>

      {/* Space Grid or Empty State */}
      {spaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              initialJoined={space.isJoined}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card/50 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <FolderSearch className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">No Spaces found</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {q
              ? `No communities matching "${q}". Try a different keyword or explore by category.`
              : 'No communities available in this category yet.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              Reset filters
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              + Create a Space
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
