'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  publishCommentEvent,
  getChannelName,
} from '@/lib/realtime/commentEvents';

export interface CommentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommentWithReplies {
  id: string;
  spaceId?: string | null;
  dropId?: string | null;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: CommentUser;
  replies?: CommentWithReplies[];
}

export interface GetSpaceCommentsResult {
  comments: CommentWithReplies[];
  totalCount: number;
}

/**
 * Retrieve threaded comments for a Space.
 * Bounded query: ordered by creation time with nested replies.
 */
export async function getSpaceComments(
  spaceId: string,
  options?: { limit?: number; cursor?: string }
): Promise<GetSpaceCommentsResult> {
  const limit = Math.min(options?.limit || 50, 100);

  try {
    const [comments, totalCount] = await Promise.all([
      prisma.comment.findMany({
        where: {
          spaceId,
          parentId: null, // Top-level comments
        },
        orderBy: { createdAt: 'desc' }, // Latest comments first
        take: limit,
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
      }),
      prisma.comment.count({
        where: { spaceId },
      }),
    ]);

    return { comments, totalCount };
  } catch (err) {
    console.error('Failed to get space comments:', err);
    return { comments: [], totalCount: 0 };
  }
}

/**
 * Retrieve threaded comments for a Drop.
 * Top-level comments with ordered nested replies. Bounded query.
 */
export async function getDropComments(
  dropId: string,
  options?: { limit?: number }
): Promise<CommentWithReplies[]> {
  const limit = Math.min(options?.limit || 50, 100);

  try {
    const comments = await prisma.comment.findMany({
      where: {
        dropId,
        parentId: null, // Get top-level comments
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
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
 * Belongs to exactly one Space OR exactly one Drop.
 */
export async function createComment(params: {
  spaceId?: string | null;
  dropId?: string | null;
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

  // Enforce XOR constraint: exactly one target
  const hasSpace = !!params.spaceId;
  const hasDrop = !!params.dropId;
  if ((!hasSpace && !hasDrop) || (hasSpace && hasDrop)) {
    return {
      success: false,
      error: 'A comment must belong to exactly one Space or Drop.',
    };
  }

  try {
    let spaceSlug: string | null = null;
    let dropSpaceSlug: string | null = null;

    if (params.spaceId) {
      const space = await prisma.space.findUnique({
        where: { id: params.spaceId },
        select: { id: true, slug: true },
      });
      if (!space) {
        return { success: false, error: 'Target Space not found.' };
      }
      spaceSlug = space.slug;
    } else if (params.dropId) {
      const drop = await prisma.drop.findUnique({
        where: { id: params.dropId },
        select: { id: true, space: { select: { slug: true } } },
      });
      if (!drop) {
        return { success: false, error: 'Target Drop not found.' };
      }
      dropSpaceSlug = drop.space?.slug || null;
    }

    // Validate parent comment integrity
    if (params.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: params.parentId },
        select: { id: true, spaceId: true, dropId: true, parentId: true },
      });

      if (!parent) {
        return { success: false, error: 'Invalid parent comment to reply to.' };
      }

      if (hasSpace && (parent.spaceId !== params.spaceId || parent.dropId !== null)) {
        return { success: false, error: 'Parent comment does not belong to this Space.' };
      }

      if (hasDrop && (parent.dropId !== params.dropId || parent.spaceId !== null)) {
        return { success: false, error: 'Parent comment does not belong to this Drop.' };
      }
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          spaceId: params.spaceId || null,
          dropId: params.dropId || null,
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

      if (params.spaceId) {
        await tx.space.update({
          where: { id: params.spaceId },
          data: {
            commentsCount: { increment: 1 },
          },
        });
      } else if (params.dropId) {
        await tx.drop.update({
          where: { id: params.dropId },
          data: {
            commentsCount: { increment: 1 },
          },
        });
      }

      return created;
    });

    // Revalidate relevant pages
    if (spaceSlug) {
      revalidatePath(`/s/${spaceSlug}`);
    }
    if (params.dropId) {
      revalidatePath(`/drop/${params.dropId}`);
      if (dropSpaceSlug) {
        revalidatePath(`/s/${dropSpaceSlug}`);
      }
    }

    const commentData: CommentWithReplies = {
      ...newComment,
      replies: [],
    };

    // Emit Realtime Event to channel
    const channel = getChannelName({
      spaceId: params.spaceId,
      dropId: params.dropId,
    });
    publishCommentEvent({
      type: 'created',
      channel,
      spaceId: params.spaceId,
      dropId: params.dropId,
      comment: commentData,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      comment: commentData,
    };
  } catch (err) {
    console.error('Failed to create comment:', err);
    return { success: false, error: 'Failed to post comment.' };
  }
}

/**
 * Delete a comment owned by the current user.
 * Decrements the Space or Drop commentsCount accurately.
 * Emits realtime event to the subscribed channel.
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
        space: { select: { id: true, slug: true } },
        drop: { select: { id: true, space: { select: { slug: true } } } },
      },
    });

    if (!comment) {
      return { success: false, error: 'Comment not found.' };
    }

    // Access control: author OR space moderator/creator can delete
    const isAuthor = comment.userId === user.id;
    let isSpaceMod = false;
    const targetSpaceId = comment.spaceId || (comment.drop ? comment.drop.space?.id : null);
    if (targetSpaceId) {
      const membership = await prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId: targetSpaceId, userId: user.id } },
        select: { role: true },
      });
      isSpaceMod = Boolean(
        membership && (membership.role === 'CREATOR' || membership.role === 'MODERATOR')
      );
    }

    if (!isAuthor && !isSpaceMod) {
      return { success: false, error: 'You do not have permission to delete this comment.' };
    }

    const totalToDelete = 1 + comment.replies.length;

    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({
        where: { id: commentId },
      });

      if (comment.spaceId) {
        const updated = await tx.space.update({
          where: { id: comment.spaceId },
          data: {
            commentsCount: { decrement: totalToDelete },
          },
          select: { commentsCount: true },
        });
        if (updated.commentsCount < 0) {
          await tx.space.update({
            where: { id: comment.spaceId },
            data: { commentsCount: 0 },
          });
        }
      } else if (comment.dropId) {
        const updated = await tx.drop.update({
          where: { id: comment.dropId },
          data: {
            commentsCount: { decrement: totalToDelete },
          },
          select: { commentsCount: true },
        });
        if (updated.commentsCount < 0) {
          await tx.drop.update({
            where: { id: comment.dropId },
            data: { commentsCount: 0 },
          });
        }
      }
    });

    // Revalidate paths
    if (comment.space?.slug) {
      revalidatePath(`/s/${comment.space.slug}`);
    }
    if (comment.dropId) {
      revalidatePath(`/drop/${comment.dropId}`);
      if (comment.drop?.space?.slug) {
        revalidatePath(`/s/${comment.drop.space.slug}`);
      }
    }

    // Emit Realtime Event to channel
    const channel = getChannelName({
      spaceId: comment.spaceId,
      dropId: comment.dropId,
    });
    publishCommentEvent({
      type: 'deleted',
      channel,
      spaceId: comment.spaceId,
      dropId: comment.dropId,
      commentId,
      parentId: comment.parentId,
      deletedCount: totalToDelete,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to delete comment:', err);
    return { success: false, error: 'Failed to delete comment.' };
  }
}

/**
 * Update an existing comment or reply owned by the current user.
 * Preserves creation timestamp and updates updatedAt.
 * Emits realtime event to the subscribed channel.
 */
export async function updateComment(params: {
  commentId: string;
  content: string;
}): Promise<{ success: boolean; comment?: CommentWithReplies; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'You must be signed in to edit comments.' };
  }

  const trimmed = params.content?.trim();
  if (!trimmed) {
    return { success: false, error: 'Comment content cannot be empty.' };
  }

  if (trimmed.length > 1000) {
    return { success: false, error: 'Comment is too long (maximum 1000 characters).' };
  }

  try {
    const existing = await prisma.comment.findUnique({
      where: { id: params.commentId },
      include: {
        space: { select: { id: true, slug: true } },
        drop: { select: { id: true, space: { select: { slug: true } } } },
      },
    });

    if (!existing) {
      return { success: false, error: 'Comment not found.' };
    }

    if (existing.userId !== user.id) {
      return { success: false, error: 'You can only edit your own comments.' };
    }

    const updated = await prisma.comment.update({
      where: { id: params.commentId },
      data: {
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

    // Revalidate paths
    if (existing.space?.slug) {
      revalidatePath(`/s/${existing.space.slug}`);
    }
    if (existing.dropId) {
      revalidatePath(`/drop/${existing.dropId}`);
      if (existing.drop?.space?.slug) {
        revalidatePath(`/s/${existing.drop.space.slug}`);
      }
    }

    const updatedCommentData: CommentWithReplies = {
      ...updated,
      replies: [],
    };

    // Emit Realtime Event to channel
    const channel = getChannelName({
      spaceId: existing.spaceId,
      dropId: existing.dropId,
    });
    publishCommentEvent({
      type: 'updated',
      channel,
      spaceId: existing.spaceId,
      dropId: existing.dropId,
      comment: updatedCommentData,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      comment: updatedCommentData,
    };
  } catch (err) {
    console.error('Failed to update comment:', err);
    return { success: false, error: 'Failed to update comment.' };
  }
}
