import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { Sparkles, Compass, Database, ShieldCheck, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  // Fetch initial spaces and stats
  const [spaces, totalDrops, totalMemberships] = await Promise.all([
    prisma.space.findMany({
      take: 6,
      orderBy: { membersCount: 'desc' },
      include: {
        drops: {
          take: 3,
          include: {
            media: {
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
    prisma.drop.count(),
    user
      ? prisma.spaceMember.findMany({
          where: { userId: user.id },
          select: { spaceId: true },
        })
      : Promise.resolve([]),
  ]);

  const joinedSpaceIds = new Set(totalMemberships.map((m) => m.spaceId));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Welcome & Foundation Status */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-secondary/80 via-card to-background border border-border/70 overflow-hidden mb-10 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 1 Foundation Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Spaces: Visual Social Commons
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Communities organized around topics, craft, and aesthetics—not follower counts.
              Currently testing as{' '}
              <span className="font-semibold text-foreground">
                {user?.displayName || 'Guest'}
              </span>{' '}
              (@{user?.username}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-background border border-border/80 text-xs">
              <Database className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">DB:</span>
              <span className="font-semibold text-foreground">SQLite Connected</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-background border border-border/80 text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">Seeded:</span>
              <span className="font-semibold text-foreground">
                {spaces.length} Spaces • {totalDrops} Drops
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Spaces Grid */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Featured Spaces</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discover community hubs and preview their visual drops
          </p>
        </div>

        <Link
          href="/explore"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 group transition-colors"
        >
          <span>View all spaces</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <SpaceCard
            key={space.id}
            space={space}
            initialJoined={joinedSpaceIds.has(space.id)}
          />
        ))}
      </div>
    </div>
  );
}
