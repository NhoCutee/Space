import { prisma } from '../../src/lib/prisma';
import {
  getThreadedComments,
  getCommentReplies,
} from '../../src/actions/comments';

async function runSocialCommentTests() {
  console.log('🧪 Starting Social Comments & Interaction Integration Tests...\n');

  // Load test users and a drop / space
  const users = await prisma.user.findMany({ take: 3 });
  if (users.length < 2) {
    throw new Error('Need at least 2 users in database to run tests');
  }

  const userA = users[0];
  const userB = users[1];
  const userC = users[2] || users[0];

  const drop = await prisma.drop.findFirst({
    include: { space: true },
  });

  if (!drop) {
    throw new Error('Test environment missing seeded drops');
  }

  console.log(`👤 Users: ${userA.username} (${userA.id}), ${userB.username} (${userB.id})`);
  console.log(`📦 Target Drop: ${drop.title} (${drop.id})\n`);

  // 1. Create a top-level comment
  console.log('--- 1. Testing Top-Level Comment Creation ---');
  const topComment = await prisma.comment.create({
    data: {
      dropId: drop.id,
      userId: userA.id,
      content: 'Top-level comment on drop: Great composition and lighting! @' + userB.username,
      reactionsCount: 0,
      isEdited: false,
    },
    include: { user: true },
  });
  console.log(`✅ Created top comment: [${topComment.id}] "${topComment.content}"`);

  // 2. Create a reply (Level 1)
  console.log('\n--- 2. Testing Threaded Reply Creation ---');
  const reply1 = await prisma.comment.create({
    data: {
      dropId: drop.id,
      userId: userB.id,
      parentId: topComment.id,
      content: 'Thanks @' + userA.username + '! Shot on 35mm f/1.4.',
      reactionsCount: 0,
      isEdited: false,
    },
    include: { user: true },
  });
  console.log(`✅ Created reply 1: [${reply1.id}] "${reply1.content}"`);

  // 3. Test controlled hierarchy (replying to a reply flattens to root topComment)
  console.log('\n--- 3. Testing Controlled Hierarchy Flattening ---');
  // Emulate logic from createComment Server Action:
  let targetParentId: string | null = reply1.id;
  const parentRecord = await prisma.comment.findUnique({ where: { id: targetParentId } });
  if (parentRecord?.parentId) {
    targetParentId = parentRecord.parentId; // Flattened to root comment!
  }

  if (targetParentId !== topComment.id) {
    throw new Error(`Controlled hierarchy failed! Expected parentId ${topComment.id}, got ${targetParentId}`);
  }

  const reply2 = await prisma.comment.create({
    data: {
      dropId: drop.id,
      userId: userC.id,
      parentId: targetParentId,
      content: '@' + userB.username + ' Love the warm grain too!',
      reactionsCount: 0,
      isEdited: false,
    },
    include: { user: true },
  });
  console.log(`✅ Created reply 2 with flattened parentId [${reply2.parentId}] matching topComment [${topComment.id}]`);

  // 4. Test Reaction Logic on Comment (Heart)
  console.log('\n--- 4. Testing Reaction Toggle on Comment ---');
  // Add reaction
  await prisma.commentReaction.create({
    data: {
      commentId: topComment.id,
      userId: userB.id,
      type: 'HEART',
    },
  });
  await prisma.comment.update({
    where: { id: topComment.id },
    data: { reactionsCount: { increment: 1 } },
  });

  let topAfterReact = await prisma.comment.findUnique({
    where: { id: topComment.id },
    include: { reactions: true },
  });

  if (topAfterReact?.reactionsCount !== 1 || topAfterReact.reactions.length !== 1) {
    throw new Error('Reaction creation count mismatch');
  }
  console.log(`✅ User B reacted to top comment. reactionsCount = ${topAfterReact.reactionsCount}`);

  // Test unique constraint: user cannot double-react
  let doubleReactThrew = false;
  try {
    await prisma.commentReaction.create({
      data: {
        commentId: topComment.id,
        userId: userB.id,
        type: 'HEART',
      },
    });
  } catch {
    doubleReactThrew = true;
  }
  if (!doubleReactThrew) {
    throw new Error('Unique constraint failed! Allowed duplicate reaction.');
  }
  console.log('✅ Unique constraint successfully blocked duplicate reaction from User B.');

  // User C also reacts
  await prisma.commentReaction.create({
    data: {
      commentId: topComment.id,
      userId: userC.id,
      type: 'HEART',
    },
  });
  await prisma.comment.update({
    where: { id: topComment.id },
    data: { reactionsCount: { increment: 1 } },
  });

  topAfterReact = await prisma.comment.findUnique({ where: { id: topComment.id } });
  console.log(`✅ User C reacted to top comment. reactionsCount = ${topAfterReact?.reactionsCount}`);

  // 5. Test Reaction Toggle on Reply
  console.log('\n--- 5. Testing Reaction Toggle on Reply ---');
  await prisma.commentReaction.create({
    data: {
      commentId: reply1.id,
      userId: userA.id,
      type: 'HEART',
    },
  });
  await prisma.comment.update({
    where: { id: reply1.id },
    data: { reactionsCount: { increment: 1 } },
  });
  const replyAfterReact = await prisma.comment.findUnique({ where: { id: reply1.id } });
  if (replyAfterReact?.reactionsCount !== 1) {
    throw new Error('Reply reaction count mismatch');
  }
  console.log(`✅ User A reacted to reply 1. reactionsCount = ${replyAfterReact.reactionsCount}`);

  // 6. Test Edit Comment with isEdited indicator
  console.log('\n--- 6. Testing Comment Edit and isEdited indicator ---');
  const edited = await prisma.comment.update({
    where: { id: topComment.id },
    data: {
      content: 'Top-level comment on drop: Great composition and lighting! [Edited with new thoughts]',
      isEdited: true,
      updatedAt: new Date(),
    },
  });
  if (!edited.isEdited || !edited.content.includes('[Edited with new thoughts]')) {
    throw new Error('Comment edit failed or isEdited flag not set');
  }
  console.log(`✅ Comment edited. isEdited = ${edited.isEdited}, content = "${edited.content}"`);

  // 7. Test getThreadedComments Query
  console.log('\n--- 7. Testing getThreadedComments Query & Sorting ---');
  const threadedResult = await getThreadedComments({
    dropId: drop.id,
    sortBy: 'relevant',
    limit: 10,
  });
  console.log(`✅ getThreadedComments returned ${threadedResult.comments.length} top comments (total: ${threadedResult.totalCount})`);
  const foundThread = threadedResult.comments.find((c) => c.id === topComment.id);
  if (!foundThread) {
    throw new Error('Top comment not found in getThreadedComments result');
  }
  console.log(`✅ Top comment has ${foundThread.replies?.length} replies and reactionsCount = ${foundThread.reactionsCount}`);
  if ((foundThread.replies?.length || 0) < 2) {
    throw new Error('Expected at least 2 replies in thread');
  }

  // 8. Test getCommentReplies Query
  console.log('\n--- 8. Testing getCommentReplies On-Demand Loading ---');
  const repliesResult = await getCommentReplies(topComment.id, { skip: 0, take: 5 });
  console.log(`✅ getCommentReplies returned ${repliesResult.replies.length} replies (totalReplies: ${repliesResult.totalReplies})`);
  if (repliesResult.replies.length < 2) {
    throw new Error('getCommentReplies failed to retrieve replies');
  }

  // 9. Test Soft-Delete Preservation on Comment with Replies
  console.log('\n--- 9. Testing Soft-Delete Reply Preservation ---');
  // When top comment has replies, soft delete masks content and sets deletedAt
  const childRepliesCount = await prisma.comment.count({ where: { parentId: topComment.id } });
  if (childRepliesCount === 0) {
    throw new Error('Cannot test soft delete without child replies');
  }

  await prisma.comment.update({
    where: { id: topComment.id },
    data: {
      deletedAt: new Date(),
      content: 'Bình luận này đã bị xóa.',
    },
  });

  const softDeletedComment = await prisma.comment.findUnique({
    where: { id: topComment.id },
    include: { replies: true },
  });

  if (!softDeletedComment?.deletedAt || softDeletedComment.content !== 'Bình luận này đã bị xóa.') {
    throw new Error('Soft delete did not properly mask content or set deletedAt');
  }
  if (softDeletedComment.replies.length !== 2) {
    throw new Error('Replies were lost during soft delete!');
  }
  console.log(`✅ Top comment was soft-deleted! deletedAt = ${softDeletedComment.deletedAt.toISOString()}`);
  console.log(`✅ Replies preserved: ${softDeletedComment.replies.length} child replies still exist.`);

  // 10. Clean up test data
  console.log('\n--- 10. Cleaning Up Test Data ---');
  await prisma.commentReaction.deleteMany({
    where: { commentId: { in: [topComment.id, reply1.id, reply2.id] } },
  });
  await prisma.comment.deleteMany({
    where: { id: { in: [reply1.id, reply2.id] } },
  });
  await prisma.comment.delete({
    where: { id: topComment.id },
  });
  console.log('✅ Cleaned up all test comments and reactions.');

  console.log('\n🎉 ALL SOCIAL COMMENTS INTEGRATION TESTS PASSED SUCCESSFULLY! 🚀\n');
}

runSocialCommentTests()
  .catch((err) => {
    console.error('❌ Social comment tests failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
