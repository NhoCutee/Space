import { prisma } from '../../src/lib/prisma';
import { uploadAvatarAction } from '../../src/actions/settings';
import sharp from 'sharp';

async function runAvatarUploadTest() {
  console.log('🧪 Testing Direct Profile Avatar Upload...\n');

  // Find a test user
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  console.log(`👤 Using user: @${user.username} (${user.id})`);

  // Generate a mock 1000x800 test PNG image buffer
  const sampleImageBuffer = await sharp({
    create: {
      width: 600,
      height: 400,
      channels: 4,
      background: { r: 99, g: 102, b: 241, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  console.log(`📸 Generated mock image buffer: ${sampleImageBuffer.length} bytes`);

  // Test sharp processing directly
  const processedBuffer = await sharp(sampleImageBuffer)
    .rotate()
    .resize(400, 400, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 85 })
    .toBuffer();

  const meta = await sharp(processedBuffer).metadata();
  console.log(`✅ Processed image metadata: format=${meta.format}, width=${meta.width}, height=${meta.height}`);

  if (meta.width !== 400 || meta.height !== 400 || meta.format !== 'webp') {
    throw new Error('Image dimensions or format do not match 400x400 webp standard');
  }

  // Test local CDN fallback / cloudinary upload function
  const { uploadAvatarImage } = await import('../../src/lib/media/cloudinary');
  const avatarUrl = await uploadAvatarImage(user.id, processedBuffer);
  console.log(`✅ Uploaded avatar URL: ${avatarUrl}`);

  // Update user in DB
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  if (updatedUser?.avatarUrl !== avatarUrl) {
    throw new Error('Avatar URL was not persisted to database user record');
  }

  console.log(`✅ Database persisted avatar URL: ${updatedUser?.avatarUrl}`);
  console.log('\n🎉 DIRECT AVATAR UPLOAD TEST PASSED SUCCESSFULLY! 🚀');
}

runAvatarUploadTest()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
