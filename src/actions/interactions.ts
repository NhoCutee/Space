'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function toggleDropReaction(dropId: string, type: 'INSPIRED' | 'AESTHETIC' | 'CLEAN' | 'HELPFUL' | 'FIRE') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');

  const existing = await prisma.reaction.findUnique({
    where: {
      dropId_userId_type: {
        dropId,
        userId: user.id,
        type,
      },
    },
  });

  if (existing) {
    // Remove reaction
    await prisma.reaction.delete({
      where: { id: existing.id },
    });
    await prisma.drop.update({
      where: { id: dropId },
      data: { reactionsCount: { decrement: 1 } },
    });
  } else {
    // Add reaction
    await prisma.reaction.create({
      data: {
        dropId,
        userId: user.id,
        type,
      },
    });
    await prisma.drop.update({
      where: { id: dropId },
      data: { reactionsCount: { increment: 1 } },
    });
  }

  revalidatePath('/');
  revalidatePath(`/drop/${dropId}`);
  return { reacted: !existing };
}

export async function postComment(dropId: string, content: string, parentId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');

  if (!content || content.trim().length === 0) {
    throw new Error('Comment cannot be empty');
  }

  const comment = await prisma.comment.create({
    data: {
      dropId,
      userId: user.id,
      parentId: parentId || null,
      content: content.trim(),
    },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  await prisma.drop.update({
    where: { id: dropId },
    data: { commentsCount: { increment: 1 } },
  });

  revalidatePath(`/drop/${dropId}`);
  return comment;
}

export async function getUserCollections() {
  const user = await getCurrentUser();
  if (!user) return [];

  return await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      items: {
        take: 4,
        include: {
          drop: {
            include: {
              media: { take: 1 },
            },
          },
        },
      },
    },
  });
}

export async function createCollection(title: string, description?: string, isPrivate: boolean = false) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');

  if (!title.trim()) throw new Error('Collection title is required');

  const collection = await prisma.collection.create({
    data: {
      userId: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      isPrivate,
    },
  });

  revalidatePath('/collections');
  return collection;
}

export async function toggleSaveToCollection(collectionId: string, dropId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Authentication required');

  // Server-side ownership verification (Mitigates BOLA/IDOR)
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { id: true, userId: true },
  });

  if (!collection || collection.userId !== user.id) {
    throw new Error('Unauthorized: You can only modify your own collections');
  }

  const existing = await prisma.collectionItem.findUnique({
    where: {
      collectionId_dropId: {
        collectionId,
        dropId,
      },
    },
  });

  if (existing) {
    await prisma.collectionItem.delete({
      where: { id: existing.id },
    });
    await prisma.collection.update({
      where: { id: collectionId },
      data: { itemsCount: { decrement: 1 } },
    });
    await prisma.drop.update({
      where: { id: dropId },
      data: { savesCount: { decrement: 1 } },
    });
    revalidatePath('/collections');
    return { saved: false };
  } else {
    await prisma.collectionItem.create({
      data: {
        collectionId,
        dropId,
      },
    });
    await prisma.collection.update({
      where: { id: collectionId },
      data: { itemsCount: { increment: 1 } },
    });
    await prisma.drop.update({
      where: { id: dropId },
      data: { savesCount: { increment: 1 } },
    });
    revalidatePath('/collections');
    return { saved: true };
  }
}
