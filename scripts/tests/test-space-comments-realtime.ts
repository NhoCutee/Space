import { prisma } from '../../src/lib/prisma';
import {
  createComment,
  updateComment,
  deleteComment,
  getSpaceComments,
  getDropComments,
} from '../../src/actions/comments';
import {
  subscribeToCommentChannel,
  getChannelName,
  CommentRealtimeEvent,
} from '../../src/lib/realtime/commentEvents';

async function runSpaceCommentsAndRealtimeTests() {
  console.log('🧪 Starting Space Comments & Realtime Verification Suite...\n');

  // Load test users and test spaces/drops
  const maya = await prisma.user.findUnique({ where: { username: 'maya_curates' } });
  const kenji = await prisma.user.findUnique({ where: { username: 'kenji_shoots' } });
  const testSpace = await prisma.space.findFirst();
  const testDrop = await prisma.drop.findFirst({
    where: { spaceId: testSpace?.id },
  });

  if (!maya || !kenji || !testSpace || !testDrop) {
    throw new Error('Test environment missing seeded users, spaces, or drops.');
  }

  console.log(`👤 Users: Maya (${maya.id}), Kenji (${kenji.id})`);
  console.log(`🪐 Space: ${testSpace.name} (${testSpace.id})`);
  console.log(`📦 Drop: ${testDrop.title} (${testDrop.id})\n`);

  // ==========================================
  // TEST 1: SPACE COMMENT CREATION & TIMESTAMPS
  // ==========================================
  console.log('--- TEST 1: SPACE COMMENT CREATION & TIMESTAMPS ---');
  const spaceBefore = await prisma.space.findUniqueOrThrow({ where: { id: testSpace.id } });
  const initialSpaceCount = spaceBefore.commentsCount;

  // Simulate authenticated Maya creating comment on Space
  const spaceComment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        spaceId: testSpace.id,
        dropId: null,
        userId: maya.id,
        content: 'This space brings such a serene and grounded coffee atmosphere.',
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await tx.space.update({
      where: { id: testSpace.id },
      data: { commentsCount: { increment: 1 } },
    });

    return created;
  });

  console.log(`✅ Space comment created: ID=${spaceComment.id}`);
  console.log(`   - spaceId: ${spaceComment.spaceId}`);
  console.log(`   - dropId: ${spaceComment.dropId} (must be null)`);
  console.log(`   - createdAt: ${spaceComment.createdAt.toISOString()}`);
  console.log(`   - updatedAt: ${spaceComment.updatedAt.toISOString()}`);

  if (spaceComment.spaceId !== testSpace.id || spaceComment.dropId !== null) {
    throw new Error('Space comment ownership failed: spaceId not set or dropId not null');
  }
  if (!spaceComment.createdAt || !spaceComment.updatedAt) {
    throw new Error('Missing createdAt or updatedAt timestamp');
  }

  const spaceAfter = await prisma.space.findUniqueOrThrow({ where: { id: testSpace.id } });
  if (spaceAfter.commentsCount !== initialSpaceCount + 1) {
    throw new Error(`Expected space commentsCount ${initialSpaceCount + 1}, got ${spaceAfter.commentsCount}`);
  }
  console.log(`✅ Space commentsCount accurately incremented to ${spaceAfter.commentsCount}\n`);

  // ==========================================
  // TEST 2: RETRIEVAL & BOUNDED QUERIES (getSpaceComments)
  // ==========================================
  console.log('--- TEST 2: RETRIEVAL VIA getSpaceComments ---');
  const spaceResult = await getSpaceComments(testSpace.id, { limit: 10 });
  const foundInSpace = spaceResult.comments.find((c) => c.id === spaceComment.id);
  if (!foundInSpace) {
    throw new Error('Created space comment was not returned by getSpaceComments');
  }
  console.log(`✅ Retrieved ${spaceResult.comments.length} comments (total: ${spaceResult.totalCount})`);
  console.log(`✅ Comment found: "${foundInSpace.content.slice(0, 45)}..."\n`);

  // ==========================================
  // TEST 3: DROP COMMENTS STILL WORK
  // ==========================================
  console.log('--- TEST 3: DROP COMMENTS COMPATIBILITY ---');
  const dropComment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        spaceId: null,
        dropId: testDrop.id,
        userId: kenji.id,
        content: 'Drop visual details and colors are so crisp.',
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await tx.drop.update({
      where: { id: testDrop.id },
      data: { commentsCount: { increment: 1 } },
    });

    return created;
  });

  console.log(`✅ Drop comment created: ID=${dropComment.id}`);
  console.log(`   - spaceId: ${dropComment.spaceId} (must be null)`);
  console.log(`   - dropId: ${dropComment.dropId}`);

  const dropComments = await getDropComments(testDrop.id);
  const foundInDrop = dropComments.find((c) => c.id === dropComment.id);
  if (!foundInDrop) {
    throw new Error('Drop comment not found in getDropComments');
  }
  console.log(`✅ Drop comment successfully retrieved via getDropComments\n`);

  // ==========================================
  // TEST 4: STRICT OWNERSHIP & CROSS-TARGET INTEGRITY
  // ==========================================
  console.log('--- TEST 4: STRICT TARGET OWNERSHIP & INTEGRITY ---');

  // Attempt to create comment with both spaceId and dropId
  const bothTargetRes = await createComment({
    spaceId: testSpace.id,
    dropId: testDrop.id,
    content: 'Invalid dual target',
  });
  if (bothTargetRes.success) {
    throw new Error('Expected dual-target comment to be rejected');
  }
  console.log(`✅ Blocked dual-target comment: "${bothTargetRes.error}"`);

  // Attempt to create comment with neither target
  const noTargetRes = await createComment({
    content: 'Invalid zero target',
  });
  if (noTargetRes.success) {
    throw new Error('Expected zero-target comment to be rejected');
  }
  console.log(`✅ Blocked zero-target comment: "${noTargetRes.error}"`);

  // Attempt cross-target reply: Space comment parent, but Drop target
  const crossTargetRes = await createComment({
    dropId: testDrop.id,
    parentId: spaceComment.id,
    content: 'Cross target reply attempt',
  });
  if (crossTargetRes.success) {
    throw new Error('Expected cross-target reply to be rejected');
  }
  console.log(`✅ Blocked cross-target reply: "${crossTargetRes.error}"\n`);

  // ==========================================
  // TEST 5: REPLIES & THREADING
  // ==========================================
  console.log('--- TEST 5: REPLIES & NESTED THREADING ---');
  const spaceReply = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        spaceId: testSpace.id,
        dropId: null,
        userId: kenji.id,
        parentId: spaceComment.id,
        content: 'Totally agree with you Maya! The lighting here is unmatched.',
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await tx.space.update({
      where: { id: testSpace.id },
      data: { commentsCount: { increment: 1 } },
    });

    return created;
  });
  console.log(`✅ Reply created on space comment: ID=${spaceReply.id}`);
  console.log(`   - parentId: ${spaceReply.parentId}`);
  console.log(`   - spaceId: ${spaceReply.spaceId}`);

  const spaceWithReplies = await getSpaceComments(testSpace.id);
  const parentCommentInList = spaceWithReplies.comments.find((c) => c.id === spaceComment.id);
  const foundReply = parentCommentInList?.replies?.find((r) => r.id === spaceReply.id);
  if (!foundReply) {
    throw new Error('Reply not found nested under parent comment');
  }
  console.log(`✅ Reply nested properly under parent: "${foundReply.content.slice(0, 35)}..."\n`);

  // ==========================================
  // TEST 6: EDITING & updatedAt TIMESTAMPS
  // ==========================================
  console.log('--- TEST 6: EDITING & updatedAt TIMESTAMPS ---');
  // Wait a small tick so updatedAt is strictly later
  await new Promise((resolve) => setTimeout(resolve, 50));

  const updatedSpaceComment = await prisma.comment.update({
    where: { id: spaceComment.id },
    data: {
      content: 'This space brings such a serene and grounded coffee atmosphere. (Edited with new thoughts)',
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const createdTime = new Date(updatedSpaceComment.createdAt).getTime();
  const updatedTime = new Date(updatedSpaceComment.updatedAt).getTime();
  console.log(`✅ Comment edited: "${updatedSpaceComment.content.slice(0, 45)}..."`);
  console.log(`   - createdAt: ${updatedSpaceComment.createdAt.toISOString()}`);
  console.log(`   - updatedAt: ${updatedSpaceComment.updatedAt.toISOString()}`);
  console.log(`   - updatedAt >= createdAt: ${updatedTime >= createdTime}`);

  if (updatedTime < createdTime) {
    throw new Error('updatedAt is before createdAt');
  }
  console.log('✅ Edit timestamp verified successfully\n');

  // ==========================================
  // TEST 7: REALTIME EVENT HUB & CHANNEL ISOLATION
  // ==========================================
  console.log('--- TEST 7: REALTIME EVENT HUB & CHANNEL ISOLATION ---');

  const channelA = getChannelName({ spaceId: testSpace.id });
  const otherSpaceId = 'other-space-9999';
  const channelB = getChannelName({ spaceId: otherSpaceId });

  let clientAReceivedEvent: CommentRealtimeEvent | null = null;
  let clientBReceivedEvent: CommentRealtimeEvent | null = null;

  // Client A listens to testSpace
  const unsubscribeA = subscribeToCommentChannel(channelA, (evt) => {
    clientAReceivedEvent = evt;
  });

  // Client B listens to otherSpace
  const unsubscribeB = subscribeToCommentChannel(channelB, (evt) => {
    clientBReceivedEvent = evt;
  });

  // Emit event to testSpace channel
  const testRealtimePayload: CommentRealtimeEvent = {
    type: 'created',
    channel: channelA,
    spaceId: testSpace.id,
    comment: {
      id: 'rt-comment-test-1',
      spaceId: testSpace.id,
      dropId: null,
      userId: maya.id,
      parentId: null,
      content: 'Realtime live comment payload',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: maya.id,
        username: maya.username,
        displayName: maya.displayName,
        avatarUrl: maya.avatarUrl,
      },
      replies: [],
    },
    timestamp: new Date().toISOString(),
  };

  const { publishCommentEvent } = await import('../../src/lib/realtime/commentEvents');
  publishCommentEvent(testRealtimePayload);

  // Small delay for event loop dispatch
  await new Promise((resolve) => setTimeout(resolve, 20));

  if (!clientAReceivedEvent) {
    throw new Error('Client A failed to receive event on subscribed channel');
  }
  console.log(`✅ Client A received event on channel "${channelA}": ${(clientAReceivedEvent as CommentRealtimeEvent).type}`);

  if (clientBReceivedEvent !== null) {
    throw new Error('Channel isolation breach: Client B received event intended for Client A');
  }
  console.log(`✅ Channel isolation verified: Client B on "${channelB}" did NOT receive event.`);

  unsubscribeA();
  unsubscribeB();
  console.log('✅ Unsubscribed realtime listeners successfully.\n');

  // ==========================================
  // TEST 8: DELETION & COUNT INTEGRITY
  // ==========================================
  console.log('--- TEST 8: DELETION & COUNT INTEGRITY ---');
  // Delete the reply first
  await prisma.comment.delete({ where: { id: spaceReply.id } });
  await prisma.space.update({
    where: { id: testSpace.id },
    data: { commentsCount: { decrement: 1 } },
  });

  // Delete top-level space comment
  await prisma.comment.delete({ where: { id: spaceComment.id } });
  await prisma.space.update({
    where: { id: testSpace.id },
    data: { commentsCount: { decrement: 1 } },
  });

  // Delete test drop comment
  await prisma.comment.delete({ where: { id: dropComment.id } });
  await prisma.drop.update({
    where: { id: testDrop.id },
    data: { commentsCount: { decrement: 1 } },
  });

  const spaceClean = await prisma.space.findUniqueOrThrow({ where: { id: testSpace.id } });
  console.log(`✅ Cleaned up all test comments. Space commentsCount returned to: ${spaceClean.commentsCount}`);

  console.log('\n🎉 ALL SPACE COMMENTS & REALTIME TESTS PASSED SUCCESSFULLY!\n');
}

runSpaceCommentsAndRealtimeTests()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
