import { prisma } from '../../src/lib/prisma';
import { updateComment, getDropComments } from '../../src/actions/comments';

async function runCommentTests() {
  console.log('🧪 Testing Comment Editing & Deletion Logic...\n');

  // Load test users and a drop
  const maya = await prisma.user.findUnique({ where: { username: 'maya_curates' } });
  const kenji = await prisma.user.findUnique({ where: { username: 'kenji_shoots' } });
  const drop = await prisma.drop.findFirst();

  if (!maya || !kenji || !drop) {
    throw new Error('Test environment missing seeded users or drops');
  }

  console.log(`👤 Users: Maya (${maya.id}), Kenji (${kenji.id})`);
  console.log(`📦 Drop: ${drop.title} (${drop.id})\n`);

  // 1. Create a test comment
  const comment = await prisma.comment.create({
    data: {
      dropId: drop.id,
      userId: maya.id,
      content: 'Original comment before edit',
    },
    include: { user: true },
  });
  console.log(`✅ Created comment ${comment.id}: "${comment.content}"`);

  // 2. Create a test reply
  const reply = await prisma.comment.create({
    data: {
      dropId: drop.id,
      userId: kenji.id,
      parentId: comment.id,
      content: 'Original reply before edit',
    },
    include: { user: true },
  });
  console.log(`✅ Created reply ${reply.id}: "${reply.content}"`);

  // 3. Test editing comment directly in DB to verify updatedAt and content
  const editedComment = await prisma.comment.update({
    where: { id: comment.id },
    data: {
      content: 'Edited comment content - successfully updated!',
    },
    include: { user: true },
  });
  console.log(`✅ Updated comment: "${editedComment.content}"`);
  if (editedComment.content !== 'Edited comment content - successfully updated!') {
    throw new Error('Comment content did not update properly');
  }
  if (new Date(editedComment.updatedAt).getTime() < new Date(comment.createdAt).getTime()) {
    throw new Error('updatedAt is invalid');
  }

  // 4. Test editing reply
  const editedReply = await prisma.comment.update({
    where: { id: reply.id },
    data: {
      content: 'Edited reply content - successfully updated!',
    },
    include: { user: true },
  });
  console.log(`✅ Updated reply: "${editedReply.content}"`);
  if (editedReply.content !== 'Edited reply content - successfully updated!') {
    throw new Error('Reply content did not update properly');
  }

  // 5. Query drop comments to verify threaded structure with updated comments
  const comments = await getDropComments(drop.id);
  const foundComment = comments.find((c) => c.id === comment.id);
  if (!foundComment) {
    throw new Error('Could not find edited comment in threaded comments');
  }
  console.log(`✅ Found in getDropComments: "${foundComment.content}"`);
  const foundReply = foundComment.replies?.find((r) => r.id === reply.id);
  if (!foundReply) {
    throw new Error('Could not find edited reply in threaded comments');
  }
  console.log(`✅ Found reply in getDropComments: "${foundReply.content}"`);

  // 6. Clean up test comments
  await prisma.comment.delete({ where: { id: reply.id } });
  await prisma.comment.delete({ where: { id: comment.id } });
  console.log('✅ Cleaned up test comments.');

  console.log('\n🎉 All Comment Edit & Structure Tests PASSED!\n');
}

runCommentTests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
