import { prisma } from '@/lib/prisma';
import { AuthUser } from '@/lib/auth';

export interface ExplainableReason {
  type: 'interest' | 'joined_space' | 'trending' | 'popular' | 'fresh' | 'starter';
  label: string;
}

export interface ScoredSpace {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  themeColor: string;
  membersCount: number;
  dropsCount: number;
  commentsCount: number;
  score: number;
  reason: ExplainableReason;
  isJoined: boolean;
  sampleDrops: Array<{
    id: string;
    title: string;
    mediaUrl: string;
    aspectRatio: number;
    variants?: string | null;
  }>;
}

export interface ScoredDrop {
  id: string;
  title: string;
  content: string | null;
  createdAt: Date;
  locationName: string | null;
  reactionsCount: number;
  commentsCount: number;
  savesCount: number;
  score: number;
  reason: ExplainableReason;
  space: {
    id: string;
    name: string;
    slug: string;
    category: string;
    themeColor: string;
  };
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  media: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
    aspectRatio: number;
    variants?: string | null;
  }>;
}

/**
 * Deterministic recommendation scoring for Spaces and Drops.
 * Fully explainable, reproducible, and zero black-box ML.
 */
export async function getRecommendedSpaces(
  user: AuthUser | null,
  limit = 6
): Promise<ScoredSpace[]> {
  const [allSpaces, userMemberships, userReactions, userSaves] = await Promise.all([
    prisma.space.findMany({
      include: {
        drops: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            media: {
              take: 1,
              select: { url: true, aspectRatio: true, variants: true },
            },
          },
        },
      },
    }),
    user
      ? prisma.spaceMember.findMany({
          where: { userId: user.id },
          include: { space: { select: { category: true } } },
        })
      : Promise.resolve([]),
    user
      ? prisma.reaction.findMany({
          where: { userId: user.id },
          include: { drop: { select: { spaceId: true } } },
          take: 20,
        })
      : Promise.resolve([]),
    user
      ? prisma.collectionItem.findMany({
          where: { collection: { userId: user.id } },
          include: { drop: { select: { spaceId: true } } },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const joinedSpaceIds = new Set(userMemberships.map((m) => m.spaceId));
  const userInterests = new Set((user?.interests || []).map((i) => i.toLowerCase().trim()));
  const joinedCategories = new Set(
    userMemberships.map((m) => m.space.category.toLowerCase().trim())
  );

  // Count interactions per space
  const spaceInteractionCount: Record<string, number> = {};
  for (const r of userReactions) {
    if (r.drop.spaceId) {
      spaceInteractionCount[r.drop.spaceId] = (spaceInteractionCount[r.drop.spaceId] || 0) + 1;
    }
  }
  for (const s of userSaves) {
    if (s.drop.spaceId) {
      spaceInteractionCount[s.drop.spaceId] = (spaceInteractionCount[s.drop.spaceId] || 0) + 2;
    }
  }

  const scored: ScoredSpace[] = allSpaces.map((space) => {
    let score = 0;
    let reason: ExplainableReason = {
      type: 'trending',
      label: 'Không gian nổi bật trong cộng đồng',
    };

    const isJoined = joinedSpaceIds.has(space.id);
    const categoryLower = space.category.toLowerCase();
    const nameLower = space.name.toLowerCase();
    const descLower = space.description.toLowerCase();

    // 1. Interest Match (highest priority signal for explainability)
    let matchingInterest: string | null = null;
    for (const interest of userInterests) {
      if (
        categoryLower.includes(interest) ||
        nameLower.includes(interest) ||
        descLower.includes(interest)
      ) {
        matchingInterest = interest;
        break;
      }
    }

    if (matchingInterest) {
      score += 60;
      reason = {
        type: 'interest',
        label: `Dựa trên sở thích ${matchingInterest.charAt(0).toUpperCase() + matchingInterest.slice(1)} của bạn`,
      };
    } else if (joinedCategories.has(categoryLower)) {
      // 2. Category Affinity with joined spaces
      score += 40;
      reason = {
        type: 'joined_space',
        label: `Tương tự như các Không gian ${space.category} bạn đã tham gia`,
      };
    } else if ((spaceInteractionCount[space.id] || 0) > 0) {
      // 3. Past Drop saves & reactions
      score += 35 + spaceInteractionCount[space.id] * 5;
      reason = {
        type: 'popular',
        label: 'Dựa trên các bài Drop bạn đã thích hoặc lưu',
      };
    } else if (space.membersCount >= 3) {
      // 4. Community Popularity
      score += 20 + space.membersCount * 2;
      reason = {
        type: 'popular',
        label: `Cộng đồng sôi nổi với ${space.membersCount} thành viên`,
      };
    } else {
      score += 10;
      reason = {
        type: 'starter',
        label: 'Không gian khám phá gợi ý cho bạn',
      };
    }

    // Activity bonus
    score += Math.min(space.dropsCount * 3, 20);
    score += Math.min(space.commentsCount * 2, 15);

    // Give unjoined spaces a discovery boost if user is joined already
    if (!isJoined && user) {
      score += 15;
    }

    return {
      id: space.id,
      slug: space.slug,
      name: space.name,
      description: space.description,
      category: space.category,
      coverImageUrl: space.coverImageUrl,
      themeColor: space.themeColor,
      membersCount: space.membersCount,
      dropsCount: space.dropsCount,
      commentsCount: space.commentsCount,
      score,
      reason,
      isJoined,
      sampleDrops: space.drops.map((d) => ({
        id: d.id,
        title: d.title,
        mediaUrl: d.media[0]?.url || space.coverImageUrl,
        aspectRatio: d.media[0]?.aspectRatio || 1.33,
        variants: d.media[0]?.variants || null,
      })),
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

/**
 * Deterministic recommendation scoring for visual Drops on Home feed.
 * Explains why each drop is surfaced.
 */
export async function getHomeFeedDrops(
  user: AuthUser | null,
  filter: 'all' | 'joined' | 'curated' = 'all',
  limit = 24
): Promise<ScoredDrop[]> {
  const userMemberships = user
    ? await prisma.spaceMember.findMany({
        where: { userId: user.id },
        select: { spaceId: true, space: { select: { name: true } } },
      })
    : [];

  const joinedSpaceMap = new Map<string, string>();
  for (const m of userMemberships) {
    joinedSpaceMap.set(m.spaceId, m.space.name);
  }

  const userInterests = new Set((user?.interests || []).map((i) => i.toLowerCase().trim()));

  // Build where clause based on filter
  const whereClause: {
    spaceId?: { in: string[] };
    isCurated?: boolean;
  } = {};

  if (filter === 'joined') {
    if (joinedSpaceMap.size === 0) {
      // If user has not joined any space, return empty array for 'joined' tab
      return [];
    }
    whereClause.spaceId = { in: Array.from(joinedSpaceMap.keys()) };
  } else if (filter === 'curated') {
    whereClause.isCurated = true;
  }

  const drops = await prisma.drop.findMany({
    where: whereClause,
    take: 60,
    orderBy: [{ createdAt: 'desc' }],
    include: {
      space: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          themeColor: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      media: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  const scoredDrops: ScoredDrop[] = drops.map((drop) => {
    let score = 0;
    let reason: ExplainableReason;

    const isFromJoinedSpace = joinedSpaceMap.has(drop.spaceId);
    const categoryLower = drop.space.category.toLowerCase();
    const titleLower = drop.title.toLowerCase();

    // 1. From user's joined space
    if (isFromJoinedSpace) {
      score += 70;
      reason = {
        type: 'joined_space',
        label: 'Từ Không gian đã tham gia',
      };
    } else {
      // 2. Matches user interest
      let matchedInterest: string | null = null;
      for (const interest of userInterests) {
        if (categoryLower.includes(interest) || titleLower.includes(interest)) {
          matchedInterest = interest;
          break;
        }
      }

      if (matchedInterest) {
        score += 50;
        reason = {
          type: 'interest',
          label: `Dựa trên sở thích ${matchedInterest.charAt(0).toUpperCase() + matchedInterest.slice(1)}`,
        };
      } else if (drop.isCurated) {
        score += 35;
        reason = {
          type: 'popular',
          label: 'Tác phẩm được tuyển chọn bởi cộng đồng',
        };
      } else if (drop.reactionsCount >= 2 || drop.savesCount >= 2) {
        score += 30 + drop.reactionsCount * 3 + drop.savesCount * 4;
        reason = {
          type: 'trending',
          label: 'Đang được chú ý',
        };
      } else {
        score += 15;
        reason = {
          type: 'fresh',
          label: 'Khám phá mới',
        };
      }
    }

    // Engagement & Freshness signal
    score += Math.min(drop.reactionsCount * 2, 20);
    score += Math.min(drop.savesCount * 3, 20);
    score += Math.min(drop.commentsCount * 2, 15);

    // Freshness decay: bonus for newer drops
    const ageHours = (Date.now() - new Date(drop.createdAt).getTime()) / (1000 * 3600);
    if (ageHours < 24) score += 15;
    else if (ageHours < 72) score += 8;

    return {
      id: drop.id,
      title: drop.title,
      content: drop.content,
      createdAt: drop.createdAt,
      locationName: drop.locationName,
      reactionsCount: drop.reactionsCount,
      commentsCount: drop.commentsCount,
      savesCount: drop.savesCount,
      score,
      reason,
      space: drop.space,
      user: drop.user,
      media: drop.media.map((m) => ({
        id: m.id,
        url: m.url,
        width: m.width,
        height: m.height,
        aspectRatio: m.aspectRatio,
        variants: m.variants,
      })),
    };
  });

  // Sort by final score descending
  scoredDrops.sort((a, b) => b.score - a.score);

  return scoredDrops.slice(0, limit);
}
