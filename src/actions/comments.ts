'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface CommentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommentWithReplies {
  id: string;
  dropId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: CommentUser;
  replies?: CommentWithReplies[];
}

/**
 * Retrieve threaded comments for a Drop.
 * Top-level comments with ordered nested replies.
 */
export async function getDropComments(dropId: string): Promise<CommentWithReplies[]> {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        dropId,
        parentId: null, // Get top-level comments
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
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
        },
      },
    });

    return comments;
  } catch (err) {
    console.error('Failed to get drop comments:', err);
    return [];
  }
}

/**
 * Create a new comment or reply to an existing comment.
 */
export async function createComment(params: {
  dropId: string;
  content: string;
  parentId?: string | null;
}): Promise<{ success: boolean; comment?: CommentWithReplies; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be signed in to comment.' };
  }

  const trimmed = params.content?.trim();
  if (!trimmed) {
    return { success: false, error: 'Comment content cannot be empty.' };
  }

  if (trimmed.length > 1000) {
    return { success: false, error: 'Comment is too long (maximum 1000 characters).' };
  }

  try {
    const drop = await prisma.drop.findUnique({
      where: { id: params.dropId },
      select: { id: true, space: { select: { slug: true } } },
    });

    if (!drop) {
      return { success: false, error: 'Drop not found.' };
    }

    if (params.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: params.parentId },
        select: { id: true, dropId: true },
      });

      if (!parent || parent.dropId !== params.dropId) {
        return { success: false, error: 'Invalid parent comment to reply to.' };
      }
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          dropId: params.dropId,
          userId: user.id,
          parentId: params.parentId || null,
          content: trimmed,
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

      await tx.drop.update({
        where: { id: params.dropId },
        data: {
          commentsCount: {
            increment: 1,
          },
        },
      });

      return created;
    });

    revalidatePath(`/drop/${params.dropId}`);
    if (drop.space?.slug) {
      revalidatePath(`/s/${drop.space.slug}`);
    }

    return {
      success: true,
      comment: {
        ...newComment,
        replies: [],
      },
    };
  } catch (err) {
    console.error('Failed to create comment:', err);
    return { success: false, error: 'Failed to post comment.' };
  }
}

/**
 * Delete a comment owned by the current user.
 * Decrements the drop commentsCount accurately taking deleted replies into account.
 */
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be signed in to delete comments.' };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        replies: { select: { id: true } },
        drop: { select: { id: true, space: { select: { slug: true } } } },
      },
    });

    if (!comment) {
      return { success: false, error: 'Comment not found.' };
    }

    // Access control: only author can delete
    if (comment.userId !== user.id) {
      return { success: false, error: 'You can only delete your own comments.' };
    }

    const totalToDelete = 1 + comment.replies.length;

    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({
        where: { id: commentId },
      });

      const updated = await tx.drop.update({
        where: { id: comment.dropId },
        data: {
          commentsCount: {
            decrement: totalToDelete,
          },
        },
        select: { commentsCount: true },
      });

      if (updated.commentsCount < 0) {
        await tx.drop.update({
          where: { id: comment.dropId },
          data: { commentsCount: 0 },
        });
      }
    });

    revalidatePath(`/drop/${comment.dropId}`);
    if (comment.drop.space?.slug) {
      revalidatePath(`/s/${comment.drop.space.slug}`);
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to delete comment:', err);
    return { success: false, error: 'Failed to delete comment.' };
  }
}
