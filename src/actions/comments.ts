'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  publishCommentEvent,
  getChannelName,
} from '@/lib/realtime/commentEvents';
import {
  CommentInputSchema,
  CommentReactionInputSchema,
  CommentEditInputSchema,
} from '@/lib/security/validation';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/security/rateLimit';

import { Prisma } from '@prisma/client';

export interface CommentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role?: string;
}

interface RawCommentReply {
  id: string;
  spaceId: string | null;
  dropId: string | null;
  userId: string;
  parentId: string | null;
  content: string;
  reactionsCount: number;
  isEdited: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: CommentUser;
  reactions?: { type: string }[];
}

interface RawCommentWithRelations extends RawCommentReply {
  _count?: { replies: number };
  replies?: RawCommentReply[];
}

export interface CommentWithReplies {
  id: string;
  spaceId?: string | null;
  dropId?: string | null;
  userId: string;
  parentId: string | null;
  content: string;
  reactionsCount: number;
  isEdited: boolean;
  deletedAt: Date | string | null;
  userReaction?: string | null; // e.g. 'HEART' if viewer reacted
  createdAt: Date;
  updatedAt: Date;
  user: CommentUser;
  repliesCount?: number;
  replies?: CommentWithReplies[];
  hasMoreReplies?: boolean;
}

export type CommentSortBy = 'relevant' | 'newest' | 'oldest';

export interface GetThreadedCommentsResult {
  comments: CommentWithReplies[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GetSpaceCommentsResult {
  comments: CommentWithReplies[];
  totalCount: number;
}

/**
 * Deterministic relevance score calculation for "Most relevant" sorting.
 * Score = (reactionsCount * 3) + (repliesCount * 2) + recencyBonus
 * Decay:
 * - Within 24 hours: +15 points
 * - Within 72 hours: +8 points
 * - Within 7 days:   +3 points
 * - Older:            0 points
 */
function calculateCommentRelevance(comment: {
  reactionsCount: number;
  repliesCount?: number;
  createdAt: Date | string;
}): number {
  const ageHours = (Date.now() - new Date(comment.createdAt).getTime()) / (1000 * 60 * 60);
  let recencyBonus = 0;
  if (ageHours <= 24) {
    recencyBonus = 15;
  } else if (ageHours <= 72) {
    recencyBonus = 8;
  } else if (ageHours <= 168) {
    recencyBonus = 3;
  }

  const reactionsWeight = (comment.reactionsCount || 0) * 3;
  const repliesWeight = (comment.repliesCount || 0) * 2;

  return reactionsWeight + repliesWeight + recencyBonus;
}

/**
 * Unified query for threaded comments across Space or Drop.
 * Supports cursor pagination, sorting (relevant/newest/oldest),
 * bounded replies loading (up to 3 initially), and viewer reaction detection.
 */
export async function getThreadedComments(params: {
  spaceId?: string | null;
  dropId?: string | null;
  sortBy?: CommentSortBy;
  cursor?: string | null;
  limit?: number;
}): Promise<GetThreadedCommentsResult> {
  const { spaceId, dropId, sortBy = 'relevant', cursor } = params;
  const limit = Math.min(params.limit || 10, 50);

  if (!spaceId && !dropId) {
    return { comments: [], totalCount: 0, hasMore: false, nextCursor: null };
  }

  const viewer = await getCurrentUser();

  try {
    const whereTarget = spaceId ? { spaceId } : { dropId };

    // Get total count of active/visible comments for this target
    const totalCount = await prisma.comment.count({
      where: whereTarget,
    });

    // Query top-level comments (parentId: null)
    const topCommentsQuery: Prisma.CommentFindManyArgs = {
      where: {
        ...whereTarget,
        parentId: null,
      },
      take: limit + 1, // Look ahead for hasMore
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
        reactions: viewer
          ? {
              where: { userId: viewer.id },
              select: { type: true },
            }
          : false,
        replies: {
          take: 3, // Initial small batch of replies
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                role: true,
              },
            },
            reactions: viewer
              ? {
                  where: { userId: viewer.id },
                  select: { type: true },
                }
              : false,
          },
        },
      },
    };

    if (cursor) {
      topCommentsQuery.skip = 1;
      topCommentsQuery.cursor = { id: cursor };
    }

    if (sortBy === 'oldest') {
      topCommentsQuery.orderBy = { createdAt: 'asc' };
    } else {
      // For both 'newest' and 'relevant', fetch latest first from DB
      topCommentsQuery.orderBy = { createdAt: 'desc' };
    }

    const fetched = (await prisma.comment.findMany(topCommentsQuery)) as unknown as RawCommentWithRelations[];

    const hasMore = fetched.length > limit;
    const rawComments = hasMore ? fetched.slice(0, limit) : fetched;
    const nextCursor = hasMore ? rawComments[rawComments.length - 1]?.id || null : null;

    // Transform and map reactions
    let mappedComments: CommentWithReplies[] = rawComments.map((c: RawCommentWithRelations) => {
      const viewerReaction = viewer && c.reactions && c.reactions.length > 0
        ? c.reactions[0].type
        : null;

      const mappedReplies: CommentWithReplies[] = (c.replies || []).map((r: RawCommentReply) => ({
        id: r.id,
        spaceId: r.spaceId,
        dropId: r.dropId,
        userId: r.userId,
        parentId: r.parentId,
        content: r.deletedAt ? 'Bình luận này đã bị xóa.' : r.content,
        reactionsCount: r.reactionsCount,
        isEdited: r.isEdited,
        deletedAt: r.deletedAt,
        userReaction: viewer && r.reactions && r.reactions.length > 0 ? r.reactions[0].type : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: r.deletedAt
          ? {
              id: 'deleted',
              username: 'deleted',
              displayName: 'Thành viên Spaces',
              avatarUrl: null,
            }
          : r.user,
        replies: [],
      }));

      const repliesCount = c._count?.replies || 0;
      const hasMoreReplies = repliesCount > mappedReplies.length;

      return {
        id: c.id,
        spaceId: c.spaceId,
        dropId: c.dropId,
        userId: c.userId,
        parentId: c.parentId,
        content: c.deletedAt ? 'Bình luận này đã bị xóa.' : c.content,
        reactionsCount: c.reactionsCount,
        isEdited: c.isEdited,
        deletedAt: c.deletedAt,
        userReaction: viewerReaction,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: c.deletedAt
          ? {
              id: 'deleted',
              username: 'deleted',
              displayName: 'Thành viên Spaces',
              avatarUrl: null,
            }
          : c.user,
        repliesCount,
        replies: mappedReplies,
        hasMoreReplies,
      };
    });

    // If 'relevant' sort requested, sort top comments deterministically
    if (sortBy === 'relevant') {
      mappedComments = [...mappedComments].sort((a, b) => {
        const scoreA = calculateCommentRelevance(a);
        const scoreB = calculateCommentRelevance(b);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return {
      comments: mappedComments,
      totalCount,
      hasMore,
      nextCursor,
    };
  } catch (err) {
    console.error('Failed to get threaded comments:', err);
    return { comments: [], totalCount: 0, hasMore: false, nextCursor: null };
  }
}

/**
 * Load on-demand additional replies for a specific top-level comment.
 */
export async function getCommentReplies(
  parentId: string,
  options?: { skip?: number; take?: number }
): Promise<{
  replies: CommentWithReplies[];
  totalReplies: number;
  hasMore: boolean;
}> {
  const skip = options?.skip || 0;
  const take = Math.min(options?.take || 10, 50);

  const viewer = await getCurrentUser();

  try {
    const [replies, totalReplies] = await Promise.all([
      prisma.comment.findMany({
        where: { parentId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: take + 1,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true,
            },
          },
          reactions: viewer
            ? {
                where: { userId: viewer.id },
                select: { type: true },
              }
            : false,
        },
      }),
      prisma.comment.count({
        where: { parentId },
      }),
    ]);

    const hasMore = replies.length > take;
    const rawReplies = hasMore ? replies.slice(0, take) : replies;
    const mappedReplies: CommentWithReplies[] = (rawReplies as unknown as RawCommentReply[]).map((r: RawCommentReply) => ({
      id: r.id,
      spaceId: r.spaceId,
      dropId: r.dropId,
      userId: r.userId,
      parentId: r.parentId,
      content: r.deletedAt ? 'Bình luận này đã bị xóa.' : r.content,
      reactionsCount: r.reactionsCount,
      isEdited: r.isEdited,
      deletedAt: r.deletedAt,
      userReaction: viewer && r.reactions && r.reactions.length > 0 ? r.reactions[0].type : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: r.deletedAt
        ? {
            id: 'deleted',
            username: 'deleted',
            displayName: 'Thành viên Spaces',
            avatarUrl: null,
          }
        : r.user,
      replies: [],
    }));

    return {
      replies: mappedReplies,
      totalReplies,
      hasMore,
    };
  } catch (err) {
    console.error('Failed to get comment replies:', err);
    return { replies: [], totalReplies: 0, hasMore: false };
  }
}

/**
 * Backward compatible wrappers for existing callers.
 */
export async function getSpaceComments(
  spaceId: string,
  options?: { limit?: number; cursor?: string; sortBy?: CommentSortBy }
): Promise<GetSpaceCommentsResult> {
  const res = await getThreadedComments({
    spaceId,
    limit: options?.limit,
    cursor: options?.cursor,
    sortBy: options?.sortBy || 'newest',
  });
  return { comments: res.comments, totalCount: res.totalCount };
}

export async function getDropComments(
  dropId: string,
  options?: { limit?: number; sortBy?: CommentSortBy }
): Promise<CommentWithReplies[]> {
  const res = await getThreadedComments({
    dropId,
    limit: options?.limit,
    sortBy: options?.sortBy || 'relevant',
  });
  return res.comments;
}

/**
 * Create a new comment or reply to an existing comment.
 * Enforces rate limiting, boundary validation, and target consistency.
 */
export async function createComment(params: {
  spaceId?: string | null;
  dropId?: string | null;
  content: string;
  parentId?: string | null;
}): Promise<{ success: boolean; comment?: CommentWithReplies; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để bình luận.' };
  }

  // Rate limiting
  const rateLimit = await checkRateLimit(
    `comment:create:${user.id}`,
    RATE_LIMIT_PRESETS.MUTATION
  );
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Thao tác quá nhanh. Vui lòng thử lại sau ${retryAfter} giây.`,
    };
  }

  const validation = CommentInputSchema.safeParse(params);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Dữ liệu bình luận không hợp lệ.',
    };
  }

  const trimmed = validation.data.content;

  // Enforce XOR constraint: exactly one target
  const hasSpace = !!params.spaceId;
  const hasDrop = !!params.dropId;
  if ((!hasSpace && !hasDrop) || (hasSpace && hasDrop)) {
    return {
      success: false,
      error: 'Bình luận phải thuộc về chính xác một Không gian hoặc Tác phẩm.',
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
        return { success: false, error: 'Không tìm thấy Không gian mục tiêu.' };
      }
      spaceSlug = space.slug;
    } else if (params.dropId) {
      const drop = await prisma.drop.findUnique({
        where: { id: params.dropId },
        select: { id: true, space: { select: { slug: true } } },
      });
      if (!drop) {
        return { success: false, error: 'Không tìm thấy Tác phẩm mục tiêu.' };
      }
      dropSpaceSlug = drop.space?.slug || null;
    }

    // Validate parent comment integrity (prevent cross-target replies!)
    let actualParentId = params.parentId || null;
    if (actualParentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: actualParentId },
        select: { id: true, spaceId: true, dropId: true, parentId: true },
      });

      if (!parent) {
        return { success: false, error: 'Bình luận gốc không tồn tại.' };
      }

      if (hasSpace && (parent.spaceId !== params.spaceId || parent.dropId !== null)) {
        return { success: false, error: 'Bình luận gốc không thuộc Không gian này.' };
      }

      if (hasDrop && (parent.dropId !== params.dropId || parent.spaceId !== null)) {
        return { success: false, error: 'Bình luận gốc không thuộc Tác phẩm này.' };
      }

      // Constrain visual hierarchy: if parent is already a reply, attach to root parent
      if (parent.parentId) {
        actualParentId = parent.parentId;
      }
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          spaceId: params.spaceId || null,
          dropId: params.dropId || null,
          userId: user.id,
          parentId: actualParentId,
          content: trimmed,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true,
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

    // Revalidate relevant paths
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
      id: newComment.id,
      spaceId: newComment.spaceId,
      dropId: newComment.dropId,
      userId: newComment.userId,
      parentId: newComment.parentId,
      content: newComment.content,
      reactionsCount: 0,
      isEdited: false,
      deletedAt: null,
      userReaction: null,
      createdAt: newComment.createdAt,
      updatedAt: newComment.updatedAt,
      user: newComment.user,
      repliesCount: 0,
      replies: [],
      hasMoreReplies: false,
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
      parentId: newComment.parentId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      comment: commentData,
    };
  } catch (err) {
    console.error('Failed to create comment:', err);
    return { success: false, error: 'Không thể đăng bình luận lúc này.' };
  }
}

/**
 * Update an existing comment or reply owned by the current user.
 */
export async function updateComment(params: {
  commentId: string;
  content: string;
}): Promise<{ success: boolean; comment?: CommentWithReplies; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để chỉnh sửa bình luận.' };
  }

  // Rate limiting
  const rateLimit = await checkRateLimit(
    `comment:edit:${user.id}`,
    RATE_LIMIT_PRESETS.MUTATION
  );
  if (!rateLimit.allowed) {
    return { success: false, error: 'Bạn đang thao tác quá nhanh.' };
  }

  const validation = CommentEditInputSchema.safeParse(params);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ.',
    };
  }

  const trimmed = validation.data.content;

  try {
    const existing = await prisma.comment.findUnique({
      where: { id: params.commentId },
      include: {
        space: { select: { id: true, slug: true } },
        drop: { select: { id: true, space: { select: { slug: true } } } },
      },
    });

    if (!existing) {
      return { success: false, error: 'Bình luận không tồn tại.' };
    }

    if (existing.userId !== user.id) {
      return { success: false, error: 'Bạn chỉ có thể chỉnh sửa bình luận của chính mình.' };
    }

    if (existing.deletedAt) {
      return { success: false, error: 'Không thể chỉnh sửa bình luận đã xóa.' };
    }

    const updated = await prisma.comment.update({
      where: { id: params.commentId },
      data: {
        content: trimmed,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
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
      id: updated.id,
      spaceId: updated.spaceId,
      dropId: updated.dropId,
      userId: updated.userId,
      parentId: updated.parentId,
      content: updated.content,
      reactionsCount: updated.reactionsCount,
      isEdited: true,
      deletedAt: null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      user: updated.user,
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
    return { success: false, error: 'Không thể cập nhật bình luận.' };
  }
}

/**
 * Delete a comment.
 * Soft-delete preservation: if comment has replies, marks as deleted
 * and masks content without orphaning replies.
 * If comment has no replies, hard deletes.
 */
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string; isSoftDeleted?: boolean }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để xóa bình luận.' };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        replies: { select: { id: true } },
        space: { select: { id: true, slug: true } },
        drop: { select: { id: true, space: { select: { id: true, slug: true } } } },
      },
    });

    if (!comment) {
      return { success: false, error: 'Bình luận không tồn tại.' };
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
      return { success: false, error: 'Bạn không có quyền xóa bình luận này.' };
    }

    const hasReplies = comment.replies.length > 0;
    const isSoftDelete = hasReplies;

    await prisma.$transaction(async (tx) => {
      if (isSoftDelete) {
        // Soft delete: keep row to preserve reply structure
        await tx.comment.update({
          where: { id: commentId },
          data: {
            deletedAt: new Date(),
            content: 'Bình luận này đã bị xóa.',
          },
        });
      } else {
        // Hard delete
        await tx.comment.delete({
          where: { id: commentId },
        });
      }

      // Decrement target commentsCount by 1
      if (comment.spaceId) {
        const updated = await tx.space.update({
          where: { id: comment.spaceId },
          data: { commentsCount: { decrement: 1 } },
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
          data: { commentsCount: { decrement: 1 } },
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
      deletedCount: 1,
      isSoftDeleted: isSoftDelete,
      timestamp: new Date().toISOString(),
    });

    return { success: true, isSoftDeleted: isSoftDelete };
  } catch (err) {
    console.error('Failed to delete comment:', err);
    return { success: false, error: 'Không thể xóa bình luận.' };
  }
}

/**
 * Toggle reaction on a comment (e.g. HEART).
 * Optimistic update supported, duplicate prevented by DB unique constraint.
 * Emits realtime event.
 */
export async function toggleCommentReaction(
  commentId: string,
  type: string = 'HEART'
): Promise<{
  success: boolean;
  reacted?: boolean;
  reactionsCount?: number;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để thả cảm xúc.' };
  }

  // Rate limiting
  const rateLimit = await checkRateLimit(
    `comment:react:${user.id}`,
    RATE_LIMIT_PRESETS.MUTATION
  );
  if (!rateLimit.allowed) {
    return { success: false, error: 'Bạn đang thao tác quá nhanh.' };
  }

  const validation = CommentReactionInputSchema.safeParse({ commentId, type });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ.',
    };
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        spaceId: true,
        dropId: true,
        parentId: true,
        reactionsCount: true,
      },
    });

    if (!comment) {
      return { success: false, error: 'Bình luận không tồn tại.' };
    }

    const existingReaction = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_type: {
          commentId,
          userId: user.id,
          type: validation.data.type,
        },
      },
    });

    let isReacted = false;
    let newCount = comment.reactionsCount;

    if (existingReaction) {
      // Remove reaction
      await prisma.$transaction(async (tx) => {
        await tx.commentReaction.delete({
          where: { id: existingReaction.id },
        });
        const updated = await tx.comment.update({
          where: { id: commentId },
          data: { reactionsCount: { decrement: 1 } },
          select: { reactionsCount: true },
        });
        newCount = Math.max(0, updated.reactionsCount);
      });
      isReacted = false;
    } else {
      // Add reaction
      await prisma.$transaction(async (tx) => {
        await tx.commentReaction.create({
          data: {
            commentId,
            userId: user.id,
            type: validation.data.type,
          },
        });
        const updated = await tx.comment.update({
          where: { id: commentId },
          data: { reactionsCount: { increment: 1 } },
          select: { reactionsCount: true },
        });
        newCount = updated.reactionsCount;
      });
      isReacted = true;
    }

    // Emit Realtime Event to channel
    const channel = getChannelName({
      spaceId: comment.spaceId,
      dropId: comment.dropId,
    });
    publishCommentEvent({
      type: 'reacted',
      channel,
      spaceId: comment.spaceId,
      dropId: comment.dropId,
      commentId,
      parentId: comment.parentId,
      reactionsCount: newCount,
      reactionType: validation.data.type,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      reacted: isReacted,
      reactionsCount: newCount,
    };
  } catch (err) {
    console.error('Failed to toggle comment reaction:', err);
    return { success: false, error: 'Không thể thay đổi cảm xúc bình luận.' };
  }
}
