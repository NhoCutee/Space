'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface CollectionSummary {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  isPrivate: boolean;
  itemsCount: number;
  createdAt: Date;
  updatedAt: Date;
  previewImages: string[];
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

/**
 * Get collections for a user.
 * If requesting for current user: returns all (including private).
 * If requesting for another user: returns only public collections.
 */
export async function getUserCollections(targetUserId?: string): Promise<CollectionSummary[]> {
  const currentUser = await getCurrentUser();
  const userId = targetUserId || currentUser?.id;

  if (!userId) {
    return [];
  }

  const isOwner = currentUser?.id === userId;

  try {
    const collections = await prisma.collection.findMany({
      where: {
        userId,
        ...(isOwner ? {} : { isPrivate: false }),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        items: {
          take: 4,
          orderBy: { addedAt: 'desc' },
          include: {
            drop: {
              include: {
                media: {
                  take: 1,
                  orderBy: { sortOrder: 'asc' },
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    return collections.map((c) => ({
      id: c.id,
      userId: c.userId,
      title: c.title,
      description: c.description,
      isPrivate: c.isPrivate,
      itemsCount: c.itemsCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: c.user,
      previewImages: c.items
        .map((it) => it.drop.media[0]?.url)
        .filter((url): url is string => Boolean(url)),
    }));
  } catch (err) {
    console.error('Failed to get user collections:', err);
    return [];
  }
}

/**
 * Get collection detail with drops.
 * Enforces privacy access control.
 */
export async function getCollectionById(collectionId: string) {
  const currentUser = await getCurrentUser();

  try {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        items: {
          orderBy: { addedAt: 'desc' },
          include: {
            drop: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
                space: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    themeColor: true,
                  },
                },
                media: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    url: true,
                    width: true,
                    height: true,
                    aspectRatio: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!collection) {
      return null;
    }

    const isOwner = currentUser?.id === collection.userId;

    // Strict Access Control for Private Collections
    if (collection.isPrivate && !isOwner) {
      return null;
    }

    return {
      ...collection,
      isOwner,
      drops: collection.items.map((it) => ({
        ...it.drop,
        addedAt: it.addedAt,
      })),
    };
  } catch (err) {
    console.error('Failed to get collection by id:', err);
    return null;
  }
}

/**
 * Create a new personal collection.
 */
export async function createCollection(params: {
  title: string;
  description?: string;
  isPrivate?: boolean;
}): Promise<{ success: boolean; collection?: CollectionSummary; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be signed in to create a collection.' };
  }

  const title = params.title?.trim();
  if (!title) {
    return { success: false, error: 'Collection title is required.' };
  }

  if (title.length > 100) {
    return { success: false, error: 'Collection title must be 100 characters or fewer.' };
  }

  try {
    const created = await prisma.collection.create({
      data: {
        userId: user.id,
        title,
        description: params.description?.trim() || null,
        isPrivate: Boolean(params.isPrivate),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    revalidatePath('/collections');

    return {
      success: true,
      collection: {
        ...created,
        previewImages: [],
      },
    };
  } catch (err) {
    console.error('Failed to create collection:', err);
    return { success: false, error: 'Failed to create collection.' };
  }
}

/**
 * Update collection title, description, or visibility.
 */
export async function updateCollection(
  collectionId: string,
  params: {
    title?: string;
    description?: string | null;
    isPrivate?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const existing = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });

    if (!existing) {
      return { success: false, error: 'Collection not found.' };
    }

    if (existing.userId !== user.id) {
      return { success: false, error: 'You do not have permission to update this collection.' };
    }

    const data: Record<string, unknown> = {};
    if (params.title !== undefined) {
      const trimmed = params.title.trim();
      if (!trimmed) return { success: false, error: 'Title cannot be empty.' };
      data.title = trimmed;
    }
    if (params.description !== undefined) {
      data.description = params.description?.trim() || null;
    }
    if (params.isPrivate !== undefined) {
      data.isPrivate = Boolean(params.isPrivate);
    }

    await prisma.collection.update({
      where: { id: collectionId },
      data,
    });

    revalidatePath(`/c/${collectionId}`);
    revalidatePath('/collections');

    return { success: true };
  } catch (err) {
    console.error('Failed to update collection:', err);
    return { success: false, error: 'Failed to update collection.' };
  }
}

/**
 * Delete a collection owned by current user.
 */
export async function deleteCollection(
  collectionId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const existing = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        items: { select: { dropId: true } },
      },
    });

    if (!existing) {
      return { success: false, error: 'Collection not found.' };
    }

    if (existing.userId !== user.id) {
      return { success: false, error: 'You can only delete your own collections.' };
    }

    await prisma.$transaction(async (tx) => {
      // Decrement savesCount on all drops in this collection
      for (const it of existing.items) {
        await tx.drop.update({
          where: { id: it.dropId },
          data: {
            savesCount: { decrement: 1 },
          },
        });
      }

      await tx.collection.delete({
        where: { id: collectionId },
      });
    });

    revalidatePath('/collections');

    return { success: true };
  } catch (err) {
    console.error('Failed to delete collection:', err);
    return { success: false, error: 'Failed to delete collection.' };
  }
}

/**
 * Save a Drop to a user's Collection.
 * Safe against duplicates.
 */
export async function saveDropToCollection(
  collectionId: string,
  dropId: string
): Promise<{ success: boolean; saved: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, saved: false, error: 'You must be signed in to save drops.' };
  }

  try {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { id: true, userId: true },
    });

    if (!collection || collection.userId !== user.id) {
      return { success: false, saved: false, error: 'Collection not found or unauthorized.' };
    }

    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      select: { id: true },
    });

    if (!drop) {
      return { success: false, saved: false, error: 'Drop not found.' };
    }

    // Check duplicate
    const existingItem = await prisma.collectionItem.findUnique({
      where: {
        collectionId_dropId: {
          collectionId,
          dropId,
        },
      },
    });

    if (existingItem) {
      return { success: true, saved: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectionItem.create({
        data: {
          collectionId,
          dropId,
        },
      });

      await tx.collection.update({
        where: { id: collectionId },
        data: {
          itemsCount: { increment: 1 },
        },
      });

      await tx.drop.update({
        where: { id: dropId },
        data: {
          savesCount: { increment: 1 },
        },
      });
    });

    revalidatePath(`/c/${collectionId}`);
    revalidatePath('/collections');
    revalidatePath(`/drop/${dropId}`);

    return { success: true, saved: true };
  } catch (err) {
    console.error('Failed to save drop to collection:', err);
    return { success: false, saved: false, error: 'Failed to save to collection.' };
  }
}

/**
 * Remove a Drop from a user's Collection.
 */
export async function removeDropFromCollection(
  collectionId: string,
  dropId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized.' };
  }

  try {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { id: true, userId: true },
    });

    if (!collection || collection.userId !== user.id) {
      return { success: false, error: 'Collection not found or unauthorized.' };
    }

    const item = await prisma.collectionItem.findUnique({
      where: {
        collectionId_dropId: {
          collectionId,
          dropId,
        },
      },
    });

    if (!item) {
      return { success: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectionItem.delete({
        where: { id: item.id },
      });

      const updatedCollection = await tx.collection.update({
        where: { id: collectionId },
        data: {
          itemsCount: { decrement: 1 },
        },
        select: { itemsCount: true },
      });

      if (updatedCollection.itemsCount < 0) {
        await tx.collection.update({
          where: { id: collectionId },
          data: { itemsCount: 0 },
        });
      }

      const updatedDrop = await tx.drop.update({
        where: { id: dropId },
        data: {
          savesCount: { decrement: 1 },
        },
        select: { savesCount: true },
      });

      if (updatedDrop.savesCount < 0) {
        await tx.drop.update({
          where: { id: dropId },
          data: { savesCount: 0 },
        });
      }
    });

    revalidatePath(`/c/${collectionId}`);
    revalidatePath('/collections');
    revalidatePath(`/drop/${dropId}`);

    return { success: true };
  } catch (err) {
    console.error('Failed to remove drop from collection:', err);
    return { success: false, error: 'Failed to remove from collection.' };
  }
}

/**
 * Check which collections of the current user contain this Drop.
 */
export async function getDropSavedCollections(dropId: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  try {
    const items = await prisma.collectionItem.findMany({
      where: {
        dropId,
        collection: {
          userId: user.id,
        },
      },
      select: {
        collectionId: true,
      },
    });

    return items.map((it) => it.collectionId);
  } catch (err) {
    console.error('Failed to get drop saved collections:', err);
    return [];
  }
}
