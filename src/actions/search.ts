'use server';

import { prisma } from '@/lib/prisma';
import { getMediaVariantUrl } from '@/lib/media/responsive';

export interface SearchResultSpace {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  membersCount: number;
  dropsCount: number;
}

export interface SearchResultDrop {
  id: string;
  title: string;
  content: string | null;
  spaceName: string;
  spaceSlug: string;
  authorName: string;
  mediaUrl: string | null;
  reactionsCount: number;
}

export interface SearchResultUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}

export interface SearchResultTopic {
  tag: string;
  count: number;
  category: string;
}

export interface UnifiedSearchResults {
  spaces: SearchResultSpace[];
  drops: SearchResultDrop[];
  users: SearchResultUser[];
  topics: SearchResultTopic[];
  totalResults: number;
}

/**
 * Universal search action across Spaces, Drops, Users, and Topics.
 */
export async function searchAll(query: string): Promise<UnifiedSearchResults> {
  const q = query.trim().toLowerCase();

  // If query is empty, return popular / trending starter recommendations
  if (!q) {
    const [popularSpaces, recentDrops, activeUsers] = await Promise.all([
      prisma.space.findMany({
        take: 4,
        orderBy: { membersCount: 'desc' },
      }),
      prisma.drop.findMany({
        take: 4,
        orderBy: { reactionsCount: 'desc' },
        include: {
          space: { select: { name: true, slug: true } },
          user: { select: { displayName: true } },
          media: { take: 1, select: { url: true, variants: true } },
        },
      }),
      prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
      }),
    ]);

    const topics: SearchResultTopic[] = [
      { tag: 'Photography', count: 12, category: 'Visual Arts' },
      { tag: 'Coffee', count: 9, category: 'Lifestyle' },
      { tag: 'Keyboards', count: 15, category: 'Craft & Tech' },
      { tag: 'Workspace', count: 8, category: 'Setup' },
    ];

    return {
      spaces: popularSpaces.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        coverImageUrl: s.coverImageUrl,
        membersCount: s.membersCount,
        dropsCount: s.dropsCount,
      })),
      drops: recentDrops.map((d) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        spaceName: d.space.name,
        spaceSlug: d.space.slug,
        authorName: d.user.displayName,
        mediaUrl: getMediaVariantUrl(d.media[0], 'thumb', d.media[0]?.url) || null,
        reactionsCount: d.reactionsCount,
      })),
      users: activeUsers,
      topics,
      totalResults: popularSpaces.length + recentDrops.length + activeUsers.length,
    };
  }

  // Active query search
  const [spaces, drops, users, allSpacesForTopics] = await Promise.all([
    prisma.space.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { category: { contains: q } },
          { slug: { contains: q } },
        ],
      },
      take: 6,
      orderBy: { membersCount: 'desc' },
    }),
    prisma.drop.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { locationName: { contains: q } },
          { specs: { contains: q } },
        ],
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        space: { select: { name: true, slug: true } },
        user: { select: { displayName: true } },
        media: { take: 1, select: { url: true, variants: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { displayName: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      take: 4,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    }),
    prisma.space.findMany({
      select: { category: true, name: true },
    }),
  ]);

  // Extract matching topics/categories
  const topicMap = new Map<string, { tag: string; count: number; category: string }>();
  for (const s of allSpacesForTopics) {
    if (s.category.toLowerCase().includes(q)) {
      const existing = topicMap.get(s.category);
      if (existing) {
        existing.count += 1;
      } else {
        topicMap.set(s.category, { tag: s.category, count: 1, category: 'Space Category' });
      }
    }
  }

  const topics = Array.from(topicMap.values()).slice(0, 4);

  return {
    spaces: spaces.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      coverImageUrl: s.coverImageUrl,
      membersCount: s.membersCount,
      dropsCount: s.dropsCount,
    })),
    drops: drops.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      spaceName: d.space.name,
      spaceSlug: d.space.slug,
      authorName: d.user.displayName,
      mediaUrl: getMediaVariantUrl(d.media[0], 'thumb', d.media[0]?.url) || null,
      reactionsCount: d.reactionsCount,
    })),
    users,
    topics,
    totalResults: spaces.length + drops.length + users.length + topics.length,
  };
}
