'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface DropMediaInput {
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurhash?: string;
}

export interface CreateDropInput {
  spaceId: string;
  title: string;
  content?: string;
  locationName?: string;
  specs?: Record<string, string>;
  palette?: string[];
  media: DropMediaInput[];
}

export interface CreateDropResult {
  success: boolean;
  dropId?: string;
  spaceSlug?: string;
  error?: string;
}

/**
 * Creates a visual Drop and publishes it into a Space.
 */
export async function createDrop(input: CreateDropInput): Promise<CreateDropResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be signed in to create a Drop.' };
  }

  // 1. Validate required fields
  if (!input.title || input.title.trim().length < 2) {
    return { success: false, error: 'Drop title must be at least 2 characters long.' };
  }

  if (input.title.trim().length > 150) {
    return { success: false, error: 'Drop title cannot exceed 150 characters.' };
  }

  if (!input.spaceId) {
    return { success: false, error: 'A destination Space must be selected.' };
  }

  const space = await prisma.space.findUnique({
    where: { id: input.spaceId },
  });

  if (!space) {
    return { success: false, error: 'The selected Space does not exist.' };
  }

  // 2. Validate media
  if (!input.media || input.media.length === 0) {
    return { success: false, error: 'At least one visual asset (image) is required to publish a Drop.' };
  }

  if (input.media.length > 10) {
    return { success: false, error: 'A Drop can contain a maximum of 10 media items.' };
  }

  for (const m of input.media) {
    if (!m.url || !m.url.trim()) {
      return { success: false, error: 'Invalid media URL provided.' };
    }
  }

  try {
    const drop = await prisma.$transaction(async (tx) => {
      const createdDrop = await tx.drop.create({
        data: {
          spaceId: space.id,
          userId: user.id,
          title: input.title.trim(),
          content: input.content?.trim() || null,
          locationName: input.locationName?.trim() || null,
          specs: input.specs && Object.keys(input.specs).length > 0 ? JSON.stringify(input.specs) : null,
          palette: input.palette && input.palette.length > 0 ? JSON.stringify(input.palette) : '[]',
          media: {
            create: input.media.map((m, idx) => ({
              url: m.url.trim(),
              width: Math.max(1, Math.round(m.width || 1200)),
              height: Math.max(1, Math.round(m.height || 800)),
              aspectRatio: m.aspectRatio > 0 ? Number(m.aspectRatio.toFixed(3)) : 1.5,
              blurhash: m.blurhash || null,
              sortOrder: idx,
            })),
          },
        },
      });

      // Increment space count
      await tx.space.update({
        where: { id: space.id },
        data: { dropsCount: { increment: 1 } },
      });

      return createdDrop;
    });

    try {
      revalidatePath('/');
      revalidatePath('/explore');
      revalidatePath(`/s/${space.slug}`);
    } catch {
      // Safe fallback when executed outside of an active HTTP request scope (e.g. testing)
    }

    return { success: true, dropId: drop.id, spaceSlug: space.slug };
  } catch (error) {
    console.error('Failed to create Drop:', error);
    return { success: false, error: 'Failed to publish Drop. Please try again.' };
  }
}

/**
 * Retrieves a single Drop by ID with creator, space, and media items.
 */
export async function getDropById(id: string) {
  try {
    const drop = await prisma.drop.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
        space: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImageUrl: true,
            themeColor: true,
            category: true,
          },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!drop) return null;

    let parsedSpecs: Record<string, string> = {};
    if (drop.specs) {
      try {
        parsedSpecs = JSON.parse(drop.specs);
      } catch {
        parsedSpecs = {};
      }
    }

    let parsedPalette: string[] = [];
    if (drop.palette) {
      try {
        parsedPalette = JSON.parse(drop.palette);
      } catch {
        parsedPalette = [];
      }
    }

    return {
      ...drop,
      parsedSpecs,
      parsedPalette,
    };
  } catch (error) {
    console.error('Error fetching Drop by ID:', error);
    return null;
  }
}

/**
 * Retrieves Drops for a specific Space.
 */
export async function getSpaceDrops(spaceSlug: string, filter: 'all' | 'curated' | 'popular' = 'all') {
  const space = await prisma.space.findUnique({
    where: { slug: spaceSlug },
  });

  if (!space) return [];

  const drops = await prisma.drop.findMany({
    where: {
      spaceId: space.id,
      ...(filter === 'curated' ? { isCurated: true } : {}),
    },
    take: 50,
    orderBy:
      filter === 'popular'
        ? [{ reactionsCount: 'desc' }, { savesCount: 'desc' }]
        : [{ createdAt: 'desc' }],
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      space: {
        select: { id: true, name: true, slug: true, themeColor: true },
      },
      media: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return drops.map((drop) => {
    let parsedSpecs: Record<string, string> = {};
    if (drop.specs) {
      try {
        parsedSpecs = JSON.parse(drop.specs);
      } catch {
        parsedSpecs = {};
      }
    }

    return {
      ...drop,
      parsedSpecs,
    };
  });
}
