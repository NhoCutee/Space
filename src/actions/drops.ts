'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { buildBaseSlug, withUniqueSlug, insertSpaceWithCreator } from '@/lib/spaces/slug';

export interface DropMediaInput {
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurhash?: string;
}

export interface CreateDropNewSpaceInput {
  name: string;
  description: string;
  category: string;
  coverImageUrl?: string;
  slug?: string;
  themeColor?: string;
  guidelines?: string;
}

export interface CreateDropInput {
  spaceId?: string;
  newSpace?: CreateDropNewSpaceInput;
  drop?: {
    title: string;
    content?: string;
    locationName?: string;
    specs?: Record<string, string>;
    palette?: string[];
    media: DropMediaInput[];
  };
  // Flat properties for backwards compatibility
  title?: string;
  content?: string;
  locationName?: string;
  specs?: Record<string, string>;
  palette?: string[];
  media?: DropMediaInput[];
}

export interface CreateDropResult {
  success: boolean;
  dropId?: string;
  spaceSlug?: string;
  spaceId?: string;
  spaceName?: string;
  error?: string;
}

/**
 * Single authoritative mutation to create a visual Drop and optionally create a new Space atomically.
 */
export async function createDrop(input: CreateDropInput): Promise<CreateDropResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be signed in to create a Drop.' };
  }

  // 1. Normalize Drop Input Fields
  const title = input.drop?.title ?? input.title ?? '';
  const content = input.drop?.content ?? input.content;
  const locationName = input.drop?.locationName ?? input.locationName;
  const specs = input.drop?.specs ?? input.specs;
  const palette = input.drop?.palette ?? input.palette;
  const media = input.drop?.media ?? input.media ?? [];

  // 2. Validate Drop fields
  if (!title || title.trim().length < 2) {
    return { success: false, error: 'Drop title must be at least 2 characters long.' };
  }

  if (title.trim().length > 150) {
    return { success: false, error: 'Drop title cannot exceed 150 characters.' };
  }

  if (!media || media.length === 0) {
    return { success: false, error: 'At least one visual asset (image) is required to publish a Drop.' };
  }

  if (media.length > 10) {
    return { success: false, error: 'A Drop can contain a maximum of 10 media items.' };
  }

  for (const m of media) {
    if (!m.url || !m.url.trim()) {
      return { success: false, error: 'Invalid media asset detected. Please wait for upload to complete.' };
    }
  }

  // 3. Validate Destination Space (Either existing spaceId OR valid newSpace payload)
  if (!input.spaceId && !input.newSpace) {
    return { success: false, error: 'A destination Space must be selected or created.' };
  }

  if (input.newSpace) {
    const trimmedName = input.newSpace.name?.trim() || '';
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      return { success: false, error: 'Space name must be between 2 and 60 characters.' };
    }

    const trimmedDesc = input.newSpace.description?.trim() || '';
    if (trimmedDesc.length < 10 || trimmedDesc.length > 500) {
      return { success: false, error: 'Space description must be between 10 and 500 characters.' };
    }

    const trimmedCategory = input.newSpace.category?.trim() || '';
    if (trimmedCategory.length < 2) {
      return { success: false, error: 'Please specify a category for the new Space.' };
    }
  }

  const newSpaceInput = input.newSpace;

  // Single transaction body. For a new Space the slug is supplied by the unique-slug allocator.
  const runTx = (newSlug?: string) =>
    prisma.$transaction(async (tx) => {
      let targetSpaceId: string;
      let targetSpaceSlug: string;
      let targetSpaceName: string;

      if (newSpaceInput && newSlug) {
        const coverUrl =
          newSpaceInput.coverImageUrl?.trim() ||
          media[0]?.url?.trim() ||
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80';

        const createdSpace = await insertSpaceWithCreator(
          tx,
          user.id,
          {
            name: newSpaceInput.name,
            description: newSpaceInput.description,
            category: newSpaceInput.category,
            coverImageUrl: coverUrl,
            themeColor: newSpaceInput.themeColor,
            guidelines: newSpaceInput.guidelines,
          },
          newSlug
        );

        targetSpaceId = createdSpace.id;
        targetSpaceSlug = createdSpace.slug;
        targetSpaceName = createdSpace.name;
      } else {
        // Existing Space: identified strictly by ID, never by display name.
        const space = await tx.space.findUnique({
          where: { id: input.spaceId },
        });

        if (!space) {
          throw new Error('The selected Space does not exist.');
        }

        targetSpaceId = space.id;
        targetSpaceSlug = space.slug;
        targetSpaceName = space.name;
      }

      const createdDrop = await tx.drop.create({
        data: {
          spaceId: targetSpaceId,
          userId: user.id,
          title: title.trim(),
          content: content?.trim() || null,
          locationName: locationName?.trim() || null,
          specs: specs && Object.keys(specs).length > 0 ? JSON.stringify(specs) : null,
          palette: palette && palette.length > 0 ? JSON.stringify(palette) : '[]',
          media: {
            create: media.map((m, idx) => ({
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

      // Increment space drop count atomically
      await tx.space.update({
        where: { id: targetSpaceId },
        data: { dropsCount: { increment: 1 } },
      });

      return {
        dropId: createdDrop.id,
        spaceSlug: targetSpaceSlug,
        spaceId: targetSpaceId,
        spaceName: targetSpaceName,
      };
    });

  try {
    const result = newSpaceInput
      ? await withUniqueSlug(buildBaseSlug(newSpaceInput.slug || newSpaceInput.name), (slug) =>
          runTx(slug)
        )
      : await runTx();

    try {
      revalidatePath('/');
      revalidatePath('/explore');
      revalidatePath('/create');
      revalidatePath(`/s/${result.spaceSlug}`);
    } catch {
      // Safe fallback when executed outside active HTTP request scope
    }

    return {
      success: true,
      dropId: result.dropId,
      spaceSlug: result.spaceSlug,
      spaceId: result.spaceId,
      spaceName: result.spaceName,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[createDrop] Failed to publish Drop:', errorMsg);
    return { success: false, error: errorMsg || 'Failed to publish Drop. Please try again.' };
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

/**
 * Deletes a Drop owned by the current user or by the Space creator/moderator.
 */
export async function deleteDrop(dropId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized: Authentication required' };
  }

  try {
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      include: {
        space: {
          select: {
            id: true,
            slug: true,
            members: {
              where: { userId: user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!drop) {
      return { success: false, error: 'Drop not found' };
    }

    const userMembership = drop.space.members[0];
    const isOwner = drop.userId === user.id;
    const isModeratorOrCreator = Boolean(
      userMembership && (userMembership.role === 'CREATOR' || userMembership.role === 'MODERATOR')
    );

    if (!isOwner && !isModeratorOrCreator) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete this Drop' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.drop.delete({ where: { id: dropId } });
      await tx.space.update({
        where: { id: drop.spaceId },
        data: { dropsCount: { decrement: 1 } },
      });
    });

    revalidatePath('/');
    revalidatePath('/explore');
    revalidatePath(`/s/${drop.space.slug}`);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete Drop:', err);
    return { success: false, error: 'Failed to delete Drop' };
  }
}
