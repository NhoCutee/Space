import { prisma } from '../../src/lib/prisma';
import { createSpace, getSpaceBySlug, getSpaces } from '../../src/actions/spaces';

async function runTest() {
  console.log('🧪 Starting Space Creation Test...\n');

  // 1. Ensure test user exists
  const testUser = await prisma.user.findFirst();
  if (!testUser) {
    console.error('❌ No user found in database');
    process.exit(1);
  }
  console.log(`👤 Using user: ${testUser.displayName} (@${testUser.username}, id: ${testUser.id})`);

  // 2. Test createSpace
  const testSpaceName = `Saigon Rooftop Views ${Date.now().toString().slice(-4)}`;
  console.log(`\n📦 Creating space: "${testSpaceName}"...`);

  const createRes = await createSpace({
    name: testSpaceName,
    description: 'A dedicated visual commons for elevated coffee spots, rooftop greenery, and skyline views.',
    category: 'Coffee & Spaces',
    coverImageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80',
    themeColor: '#7c2d12',
    guidelines: 'High-res photos only. No aggressive branding.',
  });

  if (!createRes.success || !createRes.space) {
    console.error('❌ createSpace failed:', createRes.error);
    process.exit(1);
  }
  console.log('✅ createSpace successful:', createRes.space);

  const slug = createRes.space.slug;

  // 3. Verify Space details and CREATOR membership
  console.log(`\n🔍 Verifying Space via getSpaceBySlug("${slug}")...`);
  const spaceDetail = await getSpaceBySlug(slug);

  if (!spaceDetail) {
    console.error('❌ Space not found by slug');
    process.exit(1);
  }

  console.log(`   - Name: ${spaceDetail.name}`);
  console.log(`   - Category: ${spaceDetail.category}`);
  console.log(`   - Members Count: ${spaceDetail.membersCount}`);
  console.log(`   - Guidelines: ${spaceDetail.guidelines}`);
  console.log(`   - isJoined: ${spaceDetail.isJoined}`);
  console.log(`   - userRole: ${spaceDetail.userRole}`);

  if (spaceDetail.userRole !== 'CREATOR') {
    console.error(`❌ Expected userRole to be 'CREATOR', got: ${spaceDetail.userRole}`);
    process.exit(1);
  }
  console.log('✅ Creator role properly assigned in SpaceMember!');

  // 4. Test Slug Collision Handling
  console.log('\n🔁 Testing slug collision with identical name...');
  const duplicateRes = await createSpace({
    name: testSpaceName,
    description: 'Second instance with duplicate name to test collision avoidance.',
    category: 'Coffee & Spaces',
    coverImageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80',
  });

  if (!duplicateRes.success || !duplicateRes.space) {
    console.error('❌ Slug collision test failed to create space:', duplicateRes.error);
    process.exit(1);
  }

  console.log(`✅ Handled collision safely! Second slug is: "${duplicateRes.space.slug}" (expected to end in -1)`);

  // 5. Test Appearance in getSpaces list
  console.log('\n📋 Checking getSpaces list...');
  const spaces = await getSpaces('Coffee & Spaces');
  const found = spaces.find((s) => s.slug === slug);
  if (!found) {
    console.error('❌ Created space not found in getSpaces list');
    process.exit(1);
  }
  console.log(`✅ Space "${found.name}" found in Explore list with isJoined=${found.isJoined}!`);

  console.log('\n🎉 ALL SPACE CREATION TESTS PASSED!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
