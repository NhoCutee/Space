import { prisma } from '../../src/lib/prisma';
import { createDrop, getDropById, getSpaceDrops } from '../../src/actions/drops';

async function testPhase3() {
  console.log('--- STARTING PHASE 3 AUTOMATED VALIDATION ---');

  // Find a test user and test space
  const testUser = await prisma.user.findFirst({ where: { username: 'kenji_shoots' } });
  if (!testUser) throw new Error('Test user kenji_shoots not found');

  const testSpace = await prisma.space.findUnique({ where: { slug: 'tokyo-photography' } });
  if (!testSpace) throw new Error('Test space tokyo-photography not found');

  const initialDropsCount = testSpace.dropsCount;

  // 1. Validation test: Missing title
  console.log('[TEST] 1. Validation: Missing title...');
  const res1 = await createDrop({
    spaceId: testSpace.id,
    title: '',
    media: [{ url: 'https://images.unsplash.com/photo-test', width: 1200, height: 800, aspectRatio: 1.5 }],
  });
  if (res1.success) throw new Error('Expected failure on empty title');
  console.log(`[PASS] 1. Correctly rejected missing title: "${res1.error}"`);

  // 2. Validation test: Missing media
  console.log('[TEST] 2. Validation: Missing media...');
  const res2 = await createDrop({
    spaceId: testSpace.id,
    title: 'Valid Title Here',
    media: [],
  });
  if (res2.success) throw new Error('Expected failure on empty media');
  console.log(`[PASS] 2. Correctly rejected empty media: "${res2.error}"`);

  // 3. Validation test: Invalid Space
  console.log('[TEST] 3. Validation: Non-existent Space...');
  const res3 = await createDrop({
    spaceId: 'non-existent-space-id-999',
    title: 'Valid Title',
    media: [{ url: 'https://images.unsplash.com/photo-test', width: 1200, height: 800, aspectRatio: 1.5 }],
  });
  if (res3.success) throw new Error('Expected failure on invalid space');
  console.log(`[PASS] 3. Correctly rejected invalid space: "${res3.error}"`);

  // 4. Successful Drop Creation
  console.log('[TEST] 4. Creating high-fidelity Drop with specs & multiple media...');
  const dropPayload = {
    spaceId: testSpace.id,
    title: 'Late Night Rain in Akihabara Electric Town',
    content: 'Neon reflections washing over quiet retro game alleys after midnight downpour.',
    locationName: 'Sotokanda, Chiyoda, Tokyo',
    specs: {
      Camera: 'Sony A7R V',
      Lens: 'FE 50mm f/1.2 GM',
      Aperture: 'f/1.4',
      ISO: '640',
      Shutter: '1/160s',
    },
    palette: ['#0f172a', '#38bdf8', '#fb7185', '#fbbf24'],
    media: [
      {
        url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
        width: 800,
        height: 1200,
        aspectRatio: 0.667,
      },
      {
        url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 800,
        aspectRatio: 1.5,
      },
    ],
  };

  const createRes = await createDrop(dropPayload);
  if (!createRes.success || !createRes.dropId) {
    throw new Error(`Failed to create drop: ${createRes.error}`);
  }
  console.log(`[PASS] 4. Drop created successfully with ID: ${createRes.dropId}`);

  // 5. Verify Space counter incremented
  const updatedSpace = await prisma.space.findUnique({ where: { id: testSpace.id } });
  if (updatedSpace?.dropsCount !== initialDropsCount + 1) {
    throw new Error(`Expected space dropsCount ${initialDropsCount + 1}, got ${updatedSpace?.dropsCount}`);
  }
  console.log(`[PASS] 5. Space dropsCount incremented from ${initialDropsCount} to ${updatedSpace.dropsCount}.`);

  // 6. Test getDropById
  console.log('[TEST] 6. Retrieving Drop by ID...');
  const fetchedDrop = await getDropById(createRes.dropId);
  if (!fetchedDrop) throw new Error('Failed to retrieve created Drop');
  if (fetchedDrop.title !== dropPayload.title) throw new Error('Drop title mismatch');
  if (fetchedDrop.media.length !== 2) throw new Error('Expected 2 media items');
  if (fetchedDrop.media[0].aspectRatio !== 0.667) throw new Error('Aspect ratio not preserved');
  if (!fetchedDrop.parsedSpecs?.Camera) throw new Error('Specs not parsed properly');
  console.log(`[PASS] 6. Drop detail retrieved: title="${fetchedDrop.title}", media count=${fetchedDrop.media.length}, Camera="${fetchedDrop.parsedSpecs.Camera}", aspect ratio=${fetchedDrop.media[0].aspectRatio}.`);

  // 7. Test getSpaceDrops includes the newly created Drop
  console.log('[TEST] 7. Verifying Drop appears in Space feed...');
  const spaceDrops = await getSpaceDrops(testSpace.slug);
  const found = spaceDrops.some((d) => d.id === createRes.dropId);
  if (!found) throw new Error('Created drop not found in Space drops');
  console.log(`[PASS] 7. Created Drop successfully verified inside Space "${testSpace.name}" feed.`);

  console.log('--- ALL PHASE 3 TESTS PASSED SUCCESSFULLY! ---');
}

testPhase3()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
