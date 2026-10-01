'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const DEFAULT_REACTION = 'APPRECIATE';

export interface ToggleReactionResult {
  success: boolean;
  reacted?: boolean;
  reactionsCount?: number;
  error?: string;
}

/**
 * Toggle single lightweight reaction (APPRECIATE) on a Drop.
 * Safe transaction ensuring reactionsCount consistency.
 */
export async function toggleDropReaction(dropId: string): Promise<ToggleReactionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be signed in to react.' };
  }

  try {
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      select: { id: true, reactionsCount: true, space: { select: { slug: true } } },
    });

    if (!drop) {
      return { success: false, error: 'Drop not found.' };
    }

    const existingReaction = await prisma.reaction.findUnique({
      where: {
        dropId_userId_type: {
          dropId,
          userId: user.id,
          type: DEFAULT_REACTION,
        },
      },
    });

    let isReacted = false;
    let newCount = drop.reactionsCount;

    if (existingReaction) {
      // Remove reaction
      await prisma.$transaction(async (tx) => {
        await tx.reaction.delete({
          where: { id: existingReaction.id },
        });

        const updated = await tx.drop.update({
          where: { id: dropId },
          data: {
            reactionsCount: {
              decrement: 1,
            },
          },
          select: { reactionsCount: true },
        });

        // Ensure count never dips below 0
        newCount = Math.max(0, updated.reactionsCount);
        if (updated.reactionsCount < 0) {
          await tx.drop.update({
            where: { id: dropId },
            data: { reactionsCount: 0 },
          });
        }
      });
      isReacted = false;
    } else {
      // Add reaction
      await prisma.$transaction(async (tx) => {
        await tx.reaction.create({
          data: {
            dropId,
            userId: user.id,
            type: DEFAULT_REACTION,
          },
        });

        const updated = await tx.drop.update({
          where: { id: dropId },
          data: {
            reactionsCount: {
              increment: 1,
            },
          },
          select: { reactionsCount: true },
        });

        newCount = updated.reactionsCount;
      });
      isReacted = true;
    }

    revalidatePath(`/drop/${dropId}`);
    if (drop.space?.slug) {
      revalidatePath(`/s/${drop.space.slug}`);
    }
    revalidatePath('/explore');
    revalidatePath('/');

    return {
      success: true,
      reacted: isReacted,
      reactionsCount: newCount,
    };
  } catch (err) {
    console.error('Failed to toggle reaction:', err);
    return { success: false, error: 'Failed to update reaction.' };
  }
}

/**
 * Get whether the current user has reacted to a Drop.
 */
export async function getDropReactionState(dropId: string): Promise<{ reacted: boolean }> {
  const user = await getCurrentUser();
  if (!user) {
    return { reacted: false };
  }

  const reaction = await prisma.reaction.findUnique({
    where: {
      dropId_userId_type: {
        dropId,
        userId: user.id,
        type: DEFAULT_REACTION,
      },
    },
    select: { id: true },
  });

  return { reacted: !!reaction };
}
