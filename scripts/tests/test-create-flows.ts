import { createDrop } from '@/actions/drops';
import { prisma } from '@/lib/prisma';

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS FOR UNIFIED CREATE FLOW ---');

  // Find an existing space
  const existingSpace = await prisma.space.findFirst();
  if (!existingSpace) {
    throw new Error('No existing space found to test with.');
  }
  console.log(`[TEST SETUP] Using existing space: "${existingSpace.name}" (${existingSpace.slug})`);

  // FLOW A — Existing Space
  console.log('\n[FLOW A] Testing Drop creation in existing space...');
  const resA = await createDrop({
    spaceId: existingSpace.id,
    drop: {
      title: 'Automated Test Drop Existing Space',
      content: 'Testing atomic drop creation in existing space.',
      media: [
        {
          url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80',
          width: 1200,
          height: 800,
          aspectRatio: 1.5,
        },
      ],
    },
  });

  if (!resA.success || !resA.dropId) {
    console.error('FLOW A FAILED:', resA.error);
    process.exit(1);
  }
  console.log(`✓ FLOW A PASSED: Created Drop ID ${resA.dropId} in Space "${resA.spaceSlug}"`);

  // FLOW C — Create Space + Drop atomically
  console.log('\n[FLOW C] Testing Atomic Create Space + Drop in single mutation...');
  const testSpaceName = `Test Studio ${Date.now().toString(36)}`;
  const resC = await createDrop({
    newSpace: {
      name: testSpaceName,
      description: 'An experimental aesthetic space created atomically with a drop.',
      category: 'Visual Arts',
      coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
    },
    drop: {
      title: 'Genesis Drop for Test Studio',
      content: 'Initial launch drop created atomically with the new space.',
      media: [
        {
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
          width: 1200,
          height: 800,
          aspectRatio: 1.5,
        },
      ],
    },
  });

  if (!resC.success || !resC.dropId || !resC.spaceSlug) {
    console.error('FLOW C FAILED:', resC.error);
    process.exit(1);
  }
  console.log(`✓ FLOW C PASSED: Atomically created Space "${resC.spaceName}" (${resC.spaceSlug}) with Drop ID ${resC.dropId}`);

  // FLOW E — Failure validation cases
  console.log('\n[FLOW E] Testing validation and error handling...');

  // Test 1: No space selected or provided
  const errNoSpace = await createDrop({
    drop: {
      title: 'Missing Space Drop',
      media: [{ url: 'https://example.com/img.jpg', width: 800, height: 600, aspectRatio: 1.33 }],
    },
  });
  console.log(`✓ Error on missing space: "${errNoSpace.error}" (success: ${errNoSpace.success})`);
  if (errNoSpace.success) throw new Error('Expected failure on missing space');

  // Test 2: Invalid title (too short)
  const errShortTitle = await createDrop({
    spaceId: existingSpace.id,
    drop: {
      title: 'A',
      media: [{ url: 'https://example.com/img.jpg', width: 800, height: 600, aspectRatio: 1.33 }],
    },
  });
  console.log(`✓ Error on short title: "${errShortTitle.error}" (success: ${errShortTitle.success})`);
  if (errShortTitle.success) throw new Error('Expected failure on short title');

  // Test 3: Missing media
  const errNoMedia = await createDrop({
    spaceId: existingSpace.id,
    drop: {
      title: 'Drop without media',
      media: [],
    },
  });
  console.log(`✓ Error on missing media: "${errNoMedia.error}" (success: ${errNoMedia.success})`);
  if (errNoMedia.success) throw new Error('Expected failure on missing media');

  // Test 4: Atomicity on invalid drop: space shouldn't be created if drop fails
  const rollbackSpaceName = `Rollback Test ${Date.now().toString(36)}`;
  const errRollback = await createDrop({
    newSpace: {
      name: rollbackSpaceName,
      description: 'This space should be rolled back because the drop has an invalid title.',
      category: 'Design',
    },
    drop: {
      title: 'X', // Invalid!
      media: [{ url: 'https://example.com/img.jpg', width: 800, height: 600, aspectRatio: 1.33 }],
    },
  });
  console.log(`✓ Atomic validation blocked before partial creation: "${errRollback.error}"`);
  const checkRollback = await prisma.space.findFirst({ where: { name: rollbackSpaceName } });
  if (checkRollback) {
    throw new Error('Rollback failed! Space was created despite invalid drop.');
  }
  console.log('✓ Atomic verification verified: Space was NOT created when Drop validation failed!');

  console.log('\n======================================================');
  console.log('ALL VERIFICATION FLOWS (A, C, E) PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
