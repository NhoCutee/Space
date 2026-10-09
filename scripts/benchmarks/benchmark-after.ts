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
  variantsGenTotalMs: number;
  cloudinaryUploadMs: number;
  databaseUpdateMs: number;
  totalWorkerDurationMs: number;
  userVisibleLatencyMs: number;
  httpResponseTimeMs: number;
}

export async function runOptimizedTrace(
  name: string,
  imageBuffer: Buffer,
  filename: string
): Promise<TimelineTrace> {
  const sizeBytes = imageBuffer.length;
  const sizeMB = sizeBytes / (1024 * 1024);
  const fileSizeStr = sizeMB >= 1 ? `${sizeMB.toFixed(2)} MB` : `${(sizeBytes / 1024).toFixed(0)} KB`;

  console.log(`\n======================================================`);
  console.log(`[OPTIMIZED TRACE] Running: ${name} (${fileSizeStr})`);
  console.log(`======================================================`);

  // Frontend User Experience Simulation:
  // In the optimized UI (DropComposer), the user selects files and gets an instant local preview (URL.createObjectURL)
  const t_previewStart = performance.now();
  // Client natural dimension calculation
  const metaQuick = await sharp(imageBuffer).metadata();
  const userVisiblePreviewLatencyMs = performance.now() - t_previewStart;
  console.log(`[Instant Optimistic Preview] Rendered in: ${userVisiblePreviewLatencyMs.toFixed(1)}ms`);

  // 1. Browser -> Server Upload Simulation
  const uploadStart = performance.now();
  const uploadDuration = 15 + (sizeMB * 12);
  await new Promise((r) => setTimeout(r, uploadDuration));
  const uploadEnd = performance.now();
  const uploadDurationMs = uploadEnd - uploadStart;
  const uploadSpeedMBs = Number((sizeMB / (uploadDurationMs / 1000)).toFixed(2));

  // 2. Temporary file write
  const t_writeStart = performance.now();
  const { sourcePath } = await stageOriginalUpload(imageBuffer, filename);
  const tempFileWriteMs = performance.now() - t_writeStart;

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

  // HTTP API Response Time: Now returns immediately without waiting for worker or Cloudinary!
  const httpResponseTimeMs = uploadDurationMs + tempFileWriteMs + queuePublishMs;
  console.log(`[HTTP /api/upload Response] Returned PROCESSING status in: ${httpResponseTimeMs.toFixed(1)}ms`);

  // 4. Background Worker Pickup
  const workerPickupStart = performance.now();
  await new Promise((r) => setTimeout(r, 8));
  const workerPickupMs = performance.now() - workerPickupStart;

  // 5. Worker reads staged original
  const t_readStart = performance.now();
  const readBuffer = await readFile(sourcePath);
  const originalImageReadMs = performance.now() - t_readStart;

  // 6. Optimized Image Processing: Decode once & generate 5 variants concurrently with Promise.all
  const t_processStart = performance.now();
  const processingResult = await processImageSource(readBuffer);
  const variantsGenTotalMs = performance.now() - t_processStart;
  console.log(`[Optimized Sharp Processing] 5 variants + blurhash generated concurrently in: ${variantsGenTotalMs.toFixed(1)}ms`);

  // 7. Cloudinary Upload: Upload all 5 pre-processed variants
  console.log(`[Cloudinary Upload] Uploading 5 WebP variants in parallel...`);
  const t_cloudStart = performance.now();
  const uploadedVariants = await uploadAllVariants(mediaId, processingResult.variants);
  const cloudinaryUploadMs = performance.now() - t_cloudStart;
  console.log(`[Cloudinary Upload] Finished in: ${cloudinaryUploadMs.toFixed(1)}ms`);

  // 8. Database Update to READY
  const t_dbStart = performance.now();
  await prisma.dropMedia.update({
    where: { id: mediaId },
    data: {
      status: MEDIA_STATUS.READY,
      url: uploadedVariants.large.secureUrl,
      publicId: uploadedVariants.large.publicId,
      variants: JSON.stringify({
        detail: uploadedVariants.detail?.secureUrl || uploadedVariants.large.secureUrl,
        large: uploadedVariants.large.secureUrl,
        medium: uploadedVariants.medium.secureUrl,
        small: uploadedVariants.small.secureUrl,
        thumb: uploadedVariants.thumb?.secureUrl || uploadedVariants.thumbnail?.secureUrl,
        thumbnail: uploadedVariants.thumbnail?.secureUrl,
        localThumbnail: uploadedVariants.localThumbnail?.secureUrl,
      }),
      width: processingResult.originalDimensions.width,
      height: processingResult.originalDimensions.height,
      aspectRatio: processingResult.originalDimensions.aspectRatio,
    },
  });
  const databaseUpdateMs = performance.now() - t_dbStart;

  // 9. Cleanup staged file
  await deleteStagedOriginal(sourcePath);

  const totalWorkerDurationMs =
    originalImageReadMs +
    variantsGenTotalMs +
    cloudinaryUploadMs +
    databaseUpdateMs;

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
    imageDecodeMs: 0, // decoded within processImageSource pipeline
    variantsGenTotalMs,
    cloudinaryUploadMs,
    databaseUpdateMs,
    totalWorkerDurationMs,
    userVisibleLatencyMs: userVisiblePreviewLatencyMs,
    httpResponseTimeMs,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('PHASE 2: OPTIMIZED BENCHMARK MEASUREMENT (AFTER STATE)');
  console.log('========================================================================\n');

  // Generate the exact same 4 test buffers
  console.log('Generating test images...');
  const buf500k = await sharp(crypto.randomBytes(1050 * 750 * 3), {
    raw: { width: 1050, height: 750, channels: 3 },
  }).jpeg({ quality: 85 }).toBuffer();

  const buf5mb = await sharp(crypto.randomBytes(3300 * 2400 * 3), {
    raw: { width: 3300, height: 2400, channels: 3 },
  }).jpeg({ quality: 85 }).toBuffer();

  const buf10mb = await sharp(crypto.randomBytes(4700 * 3600 * 3), {
    raw: { width: 4700, height: 3600, channels: 3 },
  }).jpeg({ quality: 85 }).toBuffer();

  const bufHighRes = await sharp(crypto.randomBytes(4000 * 3000 * 3), {
    raw: { width: 4000, height: 3000, channels: 3 },
  }).jpeg({ quality: 80 }).toBuffer();

  const results: TimelineTrace[] = [];

  results.push(await runOptimizedTrace('Test 1: 500 KB Image', buf500k, 'after-500k.jpg'));
  results.push(await runOptimizedTrace('Test 2: 5 MB Image', buf5mb, 'after-5mb.jpg'));
  results.push(await runOptimizedTrace('Test 3: 10 MB Image', buf10mb, 'after-10mb.jpg'));
  results.push(await runOptimizedTrace('Test 4: High-Res 4000x3000 (12MP)', bufHighRes, 'after-highres-4000x3000.jpg'));

  console.log('\n========================================================================');
  console.log('SUMMARY TABLE: OPTIMIZED TIMELINE (AFTER)');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Test: r.testName,
      Size: r.fileSizeStr,
      'User Visible (ms)': r.userVisibleLatencyMs.toFixed(1),
      'HTTP API (ms)': r.httpResponseTimeMs.toFixed(1),
      'Sharp Total (ms)': r.variantsGenTotalMs.toFixed(0),
      'Cloudinary (ms)': r.cloudinaryUploadMs.toFixed(0),
      'Worker Total (ms)': r.totalWorkerDurationMs.toFixed(0),
    }))
  );
}

main().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
