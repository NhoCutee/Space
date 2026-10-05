'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { buildBaseSlug, withUniqueSlug, insertSpaceWithCreator } from '@/lib/spaces/slug';

export interface SpaceActionResult {
  success: boolean;
  isJoined: boolean;
  membersCount: number;
  error?: string;
}

/**
 * Retrieves spaces with optional category and search query filters.
 */
export async function getSpaces(category?: string, query?: string) {
  const user = await getCurrentUser();

  const whereClause: {
    category?: { contains: string };
    OR?: Array<{ name: { contains: string } } | { description: { contains: string } }>;
  } = {};

  if (category && category !== 'All') {
    whereClause.category = { contains: category };
  }

  if (query && query.trim().length > 0) {
    const q = query.trim();
    whereClause.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const spaces = await prisma.space.findMany({
    where: whereClause,
    orderBy: { membersCount: 'desc' },
    include: {
      drops: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          media: {
            take: 1,
            select: { url: true, aspectRatio: true },
          },
        },
      },
      members: {
        take: 3,
        include: {
          user: {
            select: { avatarUrl: true, username: true, displayName: true },
          },
        },
      },
    },
  });

  let joinedSpaceIds = new Set<string>();
  if (user) {
    const memberships = await prisma.spaceMember.findMany({
      where: { userId: user.id },
      select: { spaceId: true },
    });
    joinedSpaceIds = new Set(memberships.map((m) => m.spaceId));
  }

  return spaces.map((space) => ({
    ...space,
    isJoined: joinedSpaceIds.has(space.id),
  }));
}

/**
 * Retrieves full details for a single Space by unique slug.
 */
export async function getSpaceBySlug(slug: string) {
  const user = await getCurrentUser();
  const cleanSlug = slug.toLowerCase().trim();

  const space = await prisma.space.findUnique({
    where: { slug: cleanSlug },
    include: {
      members: {
        take: 8,
        orderBy: { joinedAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      drops: {
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          media: {
            select: { id: true, url: true, width: true, height: true, aspectRatio: true },
          },
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      },
    },
  });

  if (!space) return null;

  let isJoined = false;
  let userRole: string | null = null;

  if (user) {
    const membership = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: space.id,
          userId: user.id,
        },
      },
    });
    if (membership) {
      isJoined = true;
      userRole = membership.role;
    }
  }

  return {
    ...space,
    isJoined,
    userRole,
  };
}

/**
 * Checks membership state for the current authenticated user.
 */
export async function getUserSpaceMembership(spaceId: string): Promise<{ isJoined: boolean; role?: string }> {
  const user = await getCurrentUser();
  if (!user) return { isJoined: false };

  const membership = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId: user.id,
      },
    },
  });

  return {
    isJoined: !!membership,
    role: membership?.role,
  };
}

/**
 * Explicit action to join a Space. Handles duplicate joins safely.
 */
export async function joinSpace(spaceId: string): Promise<SpaceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, isJoined: false, membersCount: 0, error: 'Authentication required' };
  }

  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) {
    return { success: false, isJoined: false, membersCount: 0, error: 'Space not found' };
  }

  const existing = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId: user.id,
      },
    },
  });

  if (existing) {
    // Already joined, return current state safely without duplicate record or counter increment
    return { success: true, isJoined: true, membersCount: space.membersCount };
  }

  await prisma.spaceMember.create({
    data: {
      spaceId,
      userId: user.id,
      role: 'MEMBER',
    },
  });

  const updatedSpace = await prisma.space.update({
    where: { id: spaceId },
    data: { membersCount: { increment: 1 } },
  });

  try {
    revalidatePath('/');
    revalidatePath('/explore');
    revalidatePath(`/s/${space.slug}`);
  } catch {}
  return { success: true, isJoined: true, membersCount: updatedSpace.membersCount };
}

/**
 * Explicit action to leave a Space. Handles unjoined cases safely.
 */
export async function leaveSpace(spaceId: string): Promise<SpaceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, isJoined: false, membersCount: 0, error: 'Authentication required' };
  }

  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) {
    return { success: false, isJoined: false, membersCount: 0, error: 'Space not found' };
  }

  const existing = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId: user.id,
      },
    },
  });

  if (!existing) {
    // Not joined, return current state safely without error
    return { success: true, isJoined: false, membersCount: space.membersCount };
  }

  await prisma.spaceMember.delete({
    where: { id: existing.id },
  });

  const updatedSpace = await prisma.space.update({
    where: { id: spaceId },
    data: { membersCount: { decrement: Math.min(1, space.membersCount) } },
  });

  try {
    revalidatePath('/');
    revalidatePath('/explore');
    revalidatePath(`/s/${space.slug}`);
  } catch {}
  return { success: true, isJoined: false, membersCount: updatedSpace.membersCount };
}

/**
 * Convenience toggle action to join or leave a Space.
 */
export async function toggleSpaceMembership(spaceId: string): Promise<SpaceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, isJoined: false, membersCount: 0, error: 'Authentication required' };
  }

  const existing = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId: user.id,
      },
    },
  });

  if (existing) {
    return leaveSpace(spaceId);
  } else {
    return joinSpace(spaceId);
  }
}


/**
 * 1-click toggle helper for buttons.
 */
export async function toggleJoinSpace(spaceId: string): Promise<SpaceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, isJoined: false, membersCount: 0, error: 'Authentication required' };
  }

  const existing = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId: user.id,
      },
    },
  });

  if (existing) {
    return await leaveSpace(spaceId);
  } else {
    return await joinSpace(spaceId);
  }
}

export interface CreateSpaceInput {
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  slug?: string;
  themeColor?: string;
  guidelines?: string;
}

export interface CreateSpaceResult {
  success: boolean;
  space?: {
    id: string;
    slug: string;
    name: string;
    category?: string;
    coverImageUrl?: string;
  };
  error?: string;
}

/**
 * Creates a new user-initiated Space and sets the creator's role to 'CREATOR'.
 */
export async function createSpace(input: CreateSpaceInput): Promise<CreateSpaceResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Authentication required to create a Space' };
  }

  // 1. Validation
  const trimmedName = input.name?.trim() || '';
  if (trimmedName.length < 2 || trimmedName.length > 60) {
    return { success: false, error: 'Space name must be between 2 and 60 characters' };
  }

  const trimmedDesc = input.description?.trim() || '';
  if (trimmedDesc.length < 10 || trimmedDesc.length > 500) {
    return { success: false, error: 'Space description must be between 10 and 500 characters' };
  }

  const trimmedCategory = input.category?.trim() || '';
  if (trimmedCategory.length < 2) {
    return { success: false, error: 'Please specify a category' };
  }

  const trimmedCover = input.coverImageUrl?.trim() || '';
  if (!trimmedCover) {
    return { success: false, error: 'Cover image is required' };
  }

  // 2. Slug generation: display names may repeat, slug is the unique identifier.
  const baseSlug = buildBaseSlug(input.slug || trimmedName);

  try {
    const createdSpace = await withUniqueSlug(baseSlug, (slug) =>
      prisma.$transaction((tx) =>
        insertSpaceWithCreator(
          tx,
          user.id,
          {
            name: trimmedName,
            description: trimmedDesc,
            category: trimmedCategory,
            coverImageUrl: trimmedCover,
            themeColor: input.themeColor,
            guidelines: input.guidelines,
          },
          slug
        )
      )
    );

    // Revalidate paths so the new space is reflected immediately
    try {
      revalidatePath('/');
      revalidatePath('/explore');
      revalidatePath('/drop/new');
      revalidatePath(`/s/${createdSpace.slug}`);
    } catch {
      // Ignore revalidation outside HTTP context (e.g. tests/scripts)
    }

    return {
      success: true,
      space: {
        id: createdSpace.id,
        slug: createdSpace.slug,
        name: createdSpace.name,
        category: createdSpace.category,
        coverImageUrl: createdSpace.coverImageUrl,
      },
    };
  } catch (err: unknown) {
    console.error('Error creating space:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create Space. Please try again.',
    };
  }
}
