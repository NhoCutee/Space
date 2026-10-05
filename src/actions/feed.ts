'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getRecommendedSpaces,
  getHomeFeedDrops,
  ScoredSpace,
  ScoredDrop,
} from '@/lib/recommendations/scoring';

export interface HomeFeedData {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    interests: string[];
  } | null;
  recommendedSpaces: ScoredSpace[];
  trendingSpaces: ScoredSpace[];
  feedDrops: ScoredDrop[];
  joinedSpaces: Array<{ id: string; name: string; slug: string; category: string }>;
  isNewUser: boolean;
  totalSpacesCount: number;
  totalDropsCount: number;
}

/**
 * Loads unified, explainable Home experience data.
 */
export async function getHomeFeedData(
  filter: 'all' | 'joined' | 'curated' = 'all'
): Promise<HomeFeedData> {
  const user = await getCurrentUser();

  const [recommendedSpaces, feedDrops, allTrendingSpaces, joinedMemberships, totalSpacesCount, totalDropsCount] =
    await Promise.all([
      getRecommendedSpaces(user, 6),
      getHomeFeedDrops(user, filter, 24),
      prisma.space.findMany({
        take: 6,
        orderBy: [{ membersCount: 'desc' }, { dropsCount: 'desc' }],
        include: {
          drops: {
            take: 2,
            orderBy: { createdAt: 'desc' },
            include: { media: { take: 1, select: { url: true, aspectRatio: true } } },
          },
        },
      }),
      user
        ? prisma.spaceMember.findMany({
            where: { userId: user.id },
            include: { space: { select: { id: true, name: true, slug: true, category: true } } },
          })
        : Promise.resolve([]),
      prisma.space.count(),
      prisma.drop.count(),
    ]);

  const joinedSpaces = joinedMemberships.map((m) => m.space);
  const joinedSpaceIdSet = new Set(joinedSpaces.map((s) => s.id));

  const trendingSpaces: ScoredSpace[] = allTrendingSpaces.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    category: s.category,
    coverImageUrl: s.coverImageUrl,
    themeColor: s.themeColor,
    membersCount: s.membersCount,
    dropsCount: s.dropsCount,
    commentsCount: s.commentsCount,
    score: s.membersCount * 10 + s.dropsCount * 5,
    reason: {
      type: 'trending',
      label: `Cộng đồng sôi động với ${s.membersCount} thành viên & ${s.dropsCount} Drops`,
    },
    isJoined: joinedSpaceIdSet.has(s.id),
    sampleDrops: s.drops.map((d) => ({
      id: d.id,
      title: d.title,
      mediaUrl: d.media[0]?.url || s.coverImageUrl,
      aspectRatio: d.media[0]?.aspectRatio || 1.33,
    })),
  }));

  const isNewUser = !user || ((user.interests?.length || 0) === 0 && joinedSpaces.length === 0);

  return {
    user,
    recommendedSpaces,
    trendingSpaces,
    feedDrops,
    joinedSpaces,
    isNewUser,
    totalSpacesCount,
    totalDropsCount,
  };
}
