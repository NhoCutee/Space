import sharp from 'sharp';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import {
  stageOriginalUpload,
  deleteStagedOriginal,
  publishMediaJob,
  processImageSource,
  uploadAllVariants,
  MEDIA_STATUS,
} from '../../src/lib/media';
import { prisma } from '../../src/lib/prisma';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';

interface TimelineTrace {
  testName: string;
  fileSizeBytes: number;
  fileSizeStr: string;
  uploadStartMs: number;
  uploadEndMs: number;
  uploadDurationMs: number;
  uploadSpeedMBs: number;
  tempFileWriteMs: number;
  queuePublishMs: number;
  workerPickupMs: number;
  originalImageReadMs: number;
  imageDecodeMs: number;
  smallResizeMs: number;
  mediumResizeMs: number;
  largeResizeMs: number;
  thumbnailGenMs: number;
  variantsGenTotalMs: number;
  cloudinaryUploadMs: number;
  databaseUpdateMs: number;
  totalWorkerDurationMs: number;
  totalUserVisibleLatencyBeforeMs: number;
  httpBlockedMs: number;
}

export async function runDetailedTrace(
  name: string,
  imageBuffer: Buffer,
  filename: string
): Promise<TimelineTrace> {
  const sizeBytes = imageBuffer.length;
  const sizeMB = sizeBytes / (1024 * 1024);
  const fileSizeStr = sizeMB >= 1 ? `${sizeMB.toFixed(2)} MB` : `${(sizeBytes / 1024).toFixed(0)} KB`;

  console.log(`\n======================================================`);
  console.log(`[TRACE] Running Timeline for: ${name} (${fileSizeStr})`);
  console.log(`======================================================`);

  // 1. Browser -> Server Upload Simulation
  // UPLOAD_START
  const uploadStart = performance.now();
  const t_uploadStart = Date.now();
  console.log(`[${new Date().toISOString()}] UPLOAD_START: ${filename} (${fileSizeStr})`);

  // Simulate network upload duration
  const uploadDuration = 15 + (sizeMB * 12); // Realistic LAN / fast local connection simulation
  await new Promise((r) => setTimeout(r, uploadDuration));
  const uploadEnd = performance.now();
  const uploadDurationMs = uploadEnd - uploadStart;
  const uploadSpeedMBs = Number(((sizeMB / (uploadDurationMs / 1000))).toFixed(2));
  console.log(`[${new Date().toISOString()}] UPLOAD_END: took ${uploadDurationMs.toFixed(1)}ms (${uploadSpeedMBs} MB/s)`);

  // 2. Temporary file write
  const t_writeStart = performance.now();
  const { sourcePath } = await stageOriginalUpload(imageBuffer, filename);
  const tempFileWriteMs = performance.now() - t_writeStart;
  console.log(`Stage 2: Temporary file write: ${tempFileWriteMs.toFixed(1)}ms`);

  // 3. RabbitMQ Publish
  const mediaId = randomUUID();
  await prisma.dropMedia.create({
    data: {
      id: mediaId,
      status: MEDIA_STATUS.PENDING,
      url: '',
    },
  });

  const t_publishStart = performance.now();
  const jobPayload = {
    jobId: randomUUID(),
    mediaId,
    sourcePath,
    originalFilename: filename,
    mimeType: 'image/jpeg',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
  await publishMediaJob(jobPayload);
  const queuePublishMs = performance.now() - t_publishStart;
  console.log(`[${new Date().toISOString()}] QUEUE_PUBLISHED: took ${queuePublishMs.toFixed(1)}ms`);

  // 4. Worker Pickup
  const workerPickupStart = performance.now();
  // Simulate queue dispatch to worker pickup
  await new Promise((r) => setTimeout(r, 8));
  const workerPickupMs = performance.now() - workerPickupStart;
  console.log(`[${new Date().toISOString()}] WORKER_STARTED: picked up in ${workerPickupMs.toFixed(1)}ms`);

  // 5. Worker reads staged original image
  console.log(`[${new Date().toISOString()}] PROCESSING_STARTED for media ${mediaId}`);
  const t_readStart = performance.now();
  const readBuffer = await readFile(sourcePath);
  const originalImageReadMs = performance.now() - t_readStart;
  console.log(`Stage 5: Original image read from disk: ${originalImageReadMs.toFixed(1)}ms`);

  // 6. Image decode & metadata inspection
  const t_decodeStart = performance.now();
  const meta = await sharp(readBuffer).metadata();
  const baseSharp = sharp(readBuffer).rotate();
  const rotatedMeta = await baseSharp.metadata();
  const imageDecodeMs = performance.now() - t_decodeStart;
  console.log(`Stage 6: Image decode + EXIF metadata: ${imageDecodeMs.toFixed(1)}ms (${rotatedMeta.width}x${rotatedMeta.height})`);

  // 7. Small resize (250px)
  const t_smallStart = performance.now();
  const smallBuf = await sharp(readBuffer)
    .rotate()
    .resize({ width: 250, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const smallResizeMs = performance.now() - t_smallStart;
  console.log(`Stage 7: Small resize (250px): ${smallResizeMs.toFixed(1)}ms (${(smallBuf.data.length / 1024).toFixed(1)} KB)`);

  // 8. Medium resize (640px)
  const t_medStart = performance.now();
  const medBuf = await sharp(readBuffer)
    .rotate()
    .resize({ width: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const mediumResizeMs = performance.now() - t_medStart;
  console.log(`Stage 8: Medium resize (640px): ${mediumResizeMs.toFixed(1)}ms (${(medBuf.data.length / 1024).toFixed(1)} KB)`);

  // 9. Large resize (1200px)
  const t_largeStart = performance.now();
  const largeBuf = await sharp(readBuffer)
    .rotate()
    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const largeResizeMs = performance.now() - t_largeStart;
  console.log(`Stage 9: Large resize (1200px): ${largeResizeMs.toFixed(1)}ms (${(largeBuf.data.length / 1024).toFixed(1)} KB)`);

  // 10. Thumbnail generation (Standard 500px + Local 240x200 cover crop)
  const t_thumbStart = performance.now();
  const thumbBuf = await sharp(readBuffer)
    .rotate()
    .resize({ width: 500, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const localThumbBuf = await sharp(readBuffer)
    .rotate()
    .resize({ width: 240, height: 200, fit: 'cover', position: 'centre' })
    .webp({ quality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const thumbnailGenMs = performance.now() - t_thumbStart;
  console.log(`Stage 10: Thumbnail generation (500w + 240x200 crop): ${thumbnailGenMs.toFixed(1)}ms`);

  const variantsGenTotalMs = smallResizeMs + mediumResizeMs + largeResizeMs + thumbnailGenMs;
  console.log(`[${new Date().toISOString()}] VARIANTS_GENERATED: total Sharp time = ${variantsGenTotalMs.toFixed(1)}ms`);

  // Prepare variant map for Cloudinary
  const variantsMap = {
    large: {
      variantKey: 'large' as const,
      width: largeBuf.info.width,
      height: largeBuf.info.height,
      aspectRatio: Number((largeBuf.info.width / largeBuf.info.height).toFixed(3)),
      format: largeBuf.info.format,
      buffer: largeBuf.data,
      sizeBytes: largeBuf.data.length,
    },
    medium: {
      variantKey: 'medium' as const,
      width: medBuf.info.width,
      height: medBuf.info.height,
      aspectRatio: Number((medBuf.info.width / medBuf.info.height).toFixed(3)),
      format: medBuf.info.format,
      buffer: medBuf.data,
      sizeBytes: medBuf.data.length,
    },
    small: {
      variantKey: 'small' as const,
      width: smallBuf.info.width,
      height: smallBuf.info.height,
      aspectRatio: Number((smallBuf.info.width / smallBuf.info.height).toFixed(3)),
      format: smallBuf.info.format,
      buffer: smallBuf.data,
      sizeBytes: smallBuf.data.length,
    },
    thumbnail: {
      variantKey: 'thumbnail' as const,
      width: thumbBuf.info.width,
      height: thumbBuf.info.height,
      aspectRatio: Number((thumbBuf.info.width / thumbBuf.info.height).toFixed(3)),
      format: thumbBuf.info.format,
      buffer: thumbBuf.data,
      sizeBytes: thumbBuf.data.length,
    },
    localThumbnail: {
      variantKey: 'localThumbnail' as const,
      width: localThumbBuf.info.width,
      height: localThumbBuf.info.height,
      aspectRatio: Number((localThumbBuf.info.width / localThumbBuf.info.height).toFixed(3)),
      format: localThumbBuf.info.format,
      buffer: localThumbBuf.data,
      sizeBytes: localThumbBuf.data.length,
    },
  };

  // 11. Cloudinary upload
  console.log(`[${new Date().toISOString()}] CLOUDINARY_UPLOAD_STARTED (5 variants in parallel)`);
  const t_cloudStart = performance.now();
  const uploadedVariants = await uploadAllVariants(mediaId, variantsMap);
  const cloudinaryUploadMs = performance.now() - t_cloudStart;
  console.log(`[${new Date().toISOString()}] CLOUDINARY_UPLOAD_FINISHED: took ${cloudinaryUploadMs.toFixed(1)}ms`);

  // 12. Database update
  const t_dbStart = performance.now();
  await prisma.dropMedia.update({
    where: { id: mediaId },
    data: {
      status: MEDIA_STATUS.READY,
      url: uploadedVariants.large.secureUrl,
      publicId: uploadedVariants.large.publicId,
      variants: JSON.stringify({
        large: uploadedVariants.large.secureUrl,
        medium: uploadedVariants.medium.secureUrl,
        small: uploadedVariants.small.secureUrl,
        thumbnail: uploadedVariants.thumbnail.secureUrl,
        localThumbnail: uploadedVariants.localThumbnail.secureUrl,
      }),
      width: rotatedMeta.width,
      height: rotatedMeta.height,
      aspectRatio: Number(((rotatedMeta.width || 1) / (rotatedMeta.height || 1)).toFixed(3)),
    },
  });
  const databaseUpdateMs = performance.now() - t_dbStart;
  console.log(`Stage 12: Database update to READY: ${databaseUpdateMs.toFixed(1)}ms`);

  // Cleanup staged original
  await deleteStagedOriginal(sourcePath);
  console.log(`[${new Date().toISOString()}] PROCESSING_COMPLETED for media ${mediaId}`);

  // Total worker processing duration
  const totalWorkerDurationMs =
    originalImageReadMs +
    imageDecodeMs +
    variantsGenTotalMs +
    cloudinaryUploadMs +
    databaseUpdateMs;

  // In the current BEFORE state:
  // - /api/upload route blocks for up to 1500ms waiting for DB
  // - DropComposer blocks UI spinner until READY status (entire worker time + upload time)
  const httpBlockedMs = Math.min(1500, uploadDurationMs + tempFileWriteMs + queuePublishMs + totalWorkerDurationMs);
  const totalUserVisibleLatencyBeforeMs = uploadDurationMs + tempFileWriteMs + queuePublishMs + totalWorkerDurationMs;

  return {
    testName: name,
    fileSizeBytes: sizeBytes,
    fileSizeStr,
    uploadStartMs: uploadStart,
    uploadEndMs: uploadEnd,
    uploadDurationMs,
    uploadSpeedMBs,
    tempFileWriteMs,
    queuePublishMs,
    workerPickupMs,
    originalImageReadMs,
    imageDecodeMs,
    smallResizeMs,
    mediumResizeMs,
    largeResizeMs,
    thumbnailGenMs,
    variantsGenTotalMs,
    cloudinaryUploadMs,
    databaseUpdateMs,
    totalWorkerDurationMs,
    totalUserVisibleLatencyBeforeMs,
    httpBlockedMs,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('PHASE 1: TRACE COMPLETE TIMELINE & DIAGNOSE BOTTLENECK (BEFORE STATE)');
  console.log('========================================================================\n');

  // Generate 4 test buffers
  console.log('Generating test images...');
  // 1. 500 KB image
  const buf500k = await sharp(crypto.randomBytes(1050 * 750 * 3), {
    raw: { width: 1050, height: 750, channels: 3 },
  }).jpeg({ quality: 85 }).toBuffer();

  // 2. 5 MB image
  const buf5mb = await sharp(crypto.randomBytes(3300 * 2400 * 3), {
    raw: { width: 3300, height: 2400, channels: 3 },
  }).jpeg({ quality: 85 }).toBuffer();

  // 3. 10 MB image
  const buf10mb = await sharp(crypto.randomBytes(4700 * 3600 * 3), {
    raw: { width: 4700, height: 3600, channels: 3 },
  }).jpeg({ quality: 85 }).toBuffer();

  // 4. Large-resolution image (4000x3000, 12 Megapixels)
  const bufHighRes = await sharp(crypto.randomBytes(4000 * 3000 * 3), {
    raw: { width: 4000, height: 3000, channels: 3 },
  }).jpeg({ quality: 80 }).toBuffer();

  const results: TimelineTrace[] = [];

  results.push(await runDetailedTrace('Test 1: 500 KB Image', buf500k, 'test-500k.jpg'));
  results.push(await runDetailedTrace('Test 2: 5 MB Image', buf5mb, 'test-5mb.jpg'));
  results.push(await runDetailedTrace('Test 3: 10 MB Image', buf10mb, 'test-10mb.jpg'));
  results.push(await runDetailedTrace('Test 4: High-Res 4000x3000 (12MP)', bufHighRes, 'test-highres-4000x3000.jpg'));

  console.log('\n========================================================================');
  console.log('SUMMARY TABLE: 13-STAGE TIMELINE (BEFORE OPTIMIZATION)');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Test: r.testName,
      Size: r.fileSizeStr,
      'Upload (ms)': r.uploadDurationMs.toFixed(0),
      'Stage 2 Write': r.tempFileWriteMs.toFixed(1),
      'Stage 3 Queue': r.queuePublishMs.toFixed(1),
      'Stage 6 Decode': r.imageDecodeMs.toFixed(1),
      'Stage 7 Small': r.smallResizeMs.toFixed(1),
      'Stage 8 Med': r.mediumResizeMs.toFixed(1),
      'Stage 9 Large': r.largeResizeMs.toFixed(1),
      'Stage 10 Thumb': r.thumbnailGenMs.toFixed(1),
      'Sharp Total': r.variantsGenTotalMs.toFixed(0),
      'Cloudinary (ms)': r.cloudinaryUploadMs.toFixed(0),
      'DB Update (ms)': r.databaseUpdateMs.toFixed(1),
      'Worker Total (ms)': r.totalWorkerDurationMs.toFixed(0),
      'User Wait (ms)': r.totalUserVisibleLatencyBeforeMs.toFixed(0),
    }))
  );
}

main().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
