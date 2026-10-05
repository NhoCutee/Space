import sharp from 'sharp';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const API_URL = 'http://localhost:3000/api/upload';

async function uploadImage(buffer: Buffer, filename: string, mimeType: string) {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  formData.append('file', blob, filename);

  const res = await fetch(API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Upload failed: ${JSON.stringify(err)}`);
  }

  return await res.json();
}

async function verifyDiskFile(publicUrl: string) {
  const relPath = publicUrl.startsWith('/') ? publicUrl.slice(1) : publicUrl;
  const diskPath = join(process.cwd(), 'public', relPath);
  if (!existsSync(diskPath)) {
    throw new Error(`File does not exist on disk: ${diskPath}`);
  }
  const metadata = await sharp(diskPath).metadata();
  const stat = statSync(diskPath);
  return { metadata, fileSize: stat.size, diskPath };
}

async function runTests() {
  console.log('--- STARTING IMAGE RESIZING & UPLOAD TEST SUITE ---\n');

  // 1. Small image: 400x300 (PNG)
  console.log('1. Testing Small Image (400x300, PNG):');
  const smallBuf = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 50, g: 150, b: 50 } }
  }).png().toBuffer();
  const smallRes = await uploadImage(smallBuf, 'small.png', 'image/png');
  console.log('   Response:', smallRes);
  const smallDisk = await verifyDiskFile(smallRes.url);
  console.log('   Disk dimensions:', `${smallDisk.metadata.width}x${smallDisk.metadata.height}, format: ${smallDisk.metadata.format}`);
  if (smallDisk.metadata.width !== 400 || smallDisk.metadata.height !== 300) {
    throw new Error('FAILED: Small image was resized/enlarged unexpectedly!');
  }
  console.log('   ✓ Small image preserved dimensions without upscaling!\n');

  // 2. Very large image: 4000x3000 (JPEG)
  console.log('2. Testing Very Large Image (4000x3000, JPEG):');
  const largeBuf = await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: { r: 200, g: 100, b: 50 } }
  }).jpeg().toBuffer();
  const largeRes = await uploadImage(largeBuf, 'large.jpg', 'image/jpeg');
  console.log('   Response:', largeRes);
  const largeDisk = await verifyDiskFile(largeRes.url);
  console.log('   Disk dimensions:', `${largeDisk.metadata.width}x${largeDisk.metadata.height}, format: ${largeDisk.metadata.format}, size: ${largeDisk.fileSize} bytes`);
  if (largeDisk.metadata.width !== 1920 || largeDisk.metadata.height !== 1440) {
    throw new Error(`FAILED: Expected 1920x1440, got ${largeDisk.metadata.width}x${largeDisk.metadata.height}`);
  }
  const largeAspectExpected = Number((4000 / 3000).toFixed(3));
  const largeAspectActual = Number((largeDisk.metadata.width! / largeDisk.metadata.height!).toFixed(3));
  if (largeAspectExpected !== largeAspectActual) {
    throw new Error(`FAILED: Aspect ratio mismatch: ${largeAspectExpected} vs ${largeAspectActual}`);
  }
  console.log('   ✓ Very large image reduced to 1920x1440, aspect ratio preserved exactly!\n');

  // 3. Portrait image: 1500x3000 (JPEG)
  console.log('3. Testing Portrait Image (1500x3000, JPEG):');
  const portraitBuf = await sharp({
    create: { width: 1500, height: 3000, channels: 3, background: { r: 120, g: 80, b: 220 } }
  }).jpeg().toBuffer();
  const portraitRes = await uploadImage(portraitBuf, 'portrait.jpg', 'image/jpeg');
  console.log('   Response:', portraitRes);
  const portraitDisk = await verifyDiskFile(portraitRes.url);
  console.log('   Disk dimensions:', `${portraitDisk.metadata.width}x${portraitDisk.metadata.height}, format: ${portraitDisk.metadata.format}`);
  if (portraitDisk.metadata.width !== 960 || portraitDisk.metadata.height !== 1920) {
    throw new Error(`FAILED: Expected 960x1920, got ${portraitDisk.metadata.width}x${portraitDisk.metadata.height}`);
  }
  console.log('   ✓ Portrait image reduced with height clamped to 1920, width 960, aspect ratio preserved!\n');

  // 4. Landscape image: 3200x1800 (JPEG, 16:9)
  console.log('4. Testing Landscape Image (3200x1800, 16:9):');
  const landscapeBuf = await sharp({
    create: { width: 3200, height: 1800, channels: 3, background: { r: 240, g: 180, b: 60 } }
  }).jpeg().toBuffer();
  const landscapeRes = await uploadImage(landscapeBuf, 'landscape.jpg', 'image/jpeg');
  console.log('   Response:', landscapeRes);
  const landscapeDisk = await verifyDiskFile(landscapeRes.url);
  console.log('   Disk dimensions:', `${landscapeDisk.metadata.width}x${landscapeDisk.metadata.height}, format: ${landscapeDisk.metadata.format}`);
  if (landscapeDisk.metadata.width !== 1920 || landscapeDisk.metadata.height !== 1080) {
    throw new Error(`FAILED: Expected 1920x1080, got ${landscapeDisk.metadata.width}x${landscapeDisk.metadata.height}`);
  }
  console.log('   ✓ Landscape image reduced to 1920x1080 (16:9), aspect ratio preserved!\n');

  // 5. Square image: 2500x2500 (PNG)
  console.log('5. Testing Square Image (2500x2500, PNG):');
  const squareBuf = await sharp({
    create: { width: 2500, height: 2500, channels: 3, background: { r: 80, g: 80, b: 80 } }
  }).png().toBuffer();
  const squareRes = await uploadImage(squareBuf, 'square.png', 'image/png');
  console.log('   Response:', squareRes);
  const squareDisk = await verifyDiskFile(squareRes.url);
  console.log('   Disk dimensions:', `${squareDisk.metadata.width}x${squareDisk.metadata.height}, format: ${squareDisk.metadata.format}`);
  if (squareDisk.metadata.width !== 1920 || squareDisk.metadata.height !== 1920) {
    throw new Error(`FAILED: Expected 1920x1920, got ${squareDisk.metadata.width}x${squareDisk.metadata.height}`);
  }
  console.log('   ✓ Square image reduced to 1920x1920 (1:1), aspect ratio preserved!\n');

  // 6. GIF image: 600x400 (GIF)
  console.log('6. Testing GIF Image (600x400, GIF):');
  const gifBuf = await sharp({
    create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 0, b: 128 } }
  }).gif().toBuffer();
  const gifRes = await uploadImage(gifBuf, 'test.gif', 'image/gif');
  console.log('   Response:', gifRes);
  const gifDisk = await verifyDiskFile(gifRes.url);
  console.log('   Disk dimensions:', `${gifDisk.metadata.width}x${gifDisk.metadata.height}, format: ${gifDisk.metadata.format}`);
  if (gifDisk.metadata.format !== 'gif' || gifDisk.metadata.width !== 600) {
    throw new Error('FAILED: GIF not preserved correctly');
  }
  console.log('   ✓ GIF format and dimensions preserved!\n');

  console.log('--- ALL IMAGE RESIZING TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
