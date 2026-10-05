import { Channel, ConsumeMessage } from 'amqplib';
import { prisma } from '@/lib/prisma';
import {
  RABBITMQ_QUEUE_NAME,
  MAX_RETRY_COUNT,
  MEDIA_STATUS,
} from './constants';
import { MediaJobPayload } from './types';
import { processImageSource } from './processor';
import { uploadAllVariants } from './cloudinary';
import { deleteStagedOriginal } from './staging';
import { getRabbitChannel, registerLocalWorkerHandler, publishMediaJob } from './queue';

/**
 * Core job execution function
 * Responsible for:
 * 1. Reading staged original
 * 2. Generating 5 Sharp variants (Large, Medium, Small, Thumbnail, LocalThumbnail)
 * 3. Uploading variants to Cloudinary with deterministic public IDs
 * 4. Updating database to READY
 * 5. Deleting temporary staged original
 */
export async function executeImageProcessingJob(job: MediaJobPayload): Promise<void> {
  const { mediaId, dropId, sourcePath, retryCount } = job;
  console.log(`[ImageWorker] Processing job ${job.jobId} for media ${mediaId} (attempt ${retryCount + 1})...`);

  // 1. Idempotency Check: check if already successfully processed
  const existing = await prisma.dropMedia.findUnique({
    where: { id: mediaId },
  });

  if (existing?.status === MEDIA_STATUS.READY) {
    console.log(`[ImageWorker] Media ${mediaId} is already READY. Skipping duplicate job.`);
    await deleteStagedOriginal(sourcePath);
    return;
  }

  // 2. Update status to PROCESSING
  await prisma.dropMedia.upsert({
    where: { id: mediaId },
    update: { status: MEDIA_STATUS.PROCESSING },
    create: {
      id: mediaId,
      dropId: dropId || null,
      status: MEDIA_STATUS.PROCESSING,
      url: '',
    },
  });

  try {
    // 3. Process image with Sharp to generate all 5 variants concurrently
    const processingResult = await processImageSource(sourcePath);

    // 4. Upload pre-processed variants to Cloudinary (or local CDN fallback)
    const uploadedVariants = await uploadAllVariants(
      mediaId,
      processingResult.variants,
      dropId
    );

    // 5. Structure variant URLs
    const variantUrls: Record<string, string> = {
      large: uploadedVariants.large.secureUrl,
      medium: uploadedVariants.medium.secureUrl,
      small: uploadedVariants.small.secureUrl,
      thumbnail: uploadedVariants.thumbnail.secureUrl,
      localThumbnail: uploadedVariants.localThumbnail.secureUrl,
    };

    // 6. Update Database with READY status and dimensions
    await prisma.dropMedia.update({
      where: { id: mediaId },
      data: {
        status: MEDIA_STATUS.READY,
        url: uploadedVariants.large.secureUrl,
        publicId: uploadedVariants.large.publicId,
        variants: JSON.stringify(variantUrls),
        width: processingResult.originalDimensions.width,
        height: processingResult.originalDimensions.height,
        aspectRatio: processingResult.originalDimensions.aspectRatio,
        blurhash: processingResult.blurhash || null,
        errorMessage: null,
      },
    });

    console.log(`[ImageWorker] Successfully processed and uploaded variants for media ${mediaId}!`);

    // 7. Cleanup: Delete temporary staged original file ONLY after all uploads and DB update succeed
    const cleanupResult = await deleteStagedOriginal(sourcePath);
    if (!cleanupResult.success) {
      console.warn(`[ImageWorker] Warning: Failed to cleanup staged file ${sourcePath}: ${cleanupResult.error}`);
    } else {
      console.log(`[ImageWorker] Staged original file deleted successfully: ${sourcePath}`);
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ImageWorker] Error processing media ${mediaId}:`, errorMsg);

    const nextRetry = retryCount + 1;
    if (nextRetry < MAX_RETRY_COUNT) {
      console.log(`[ImageWorker] Retrying job ${job.jobId} (attempt ${nextRetry + 1}/${MAX_RETRY_COUNT})...`);
      // Re-queue with incremented retry count
      await publishMediaJob({
        ...job,
        retryCount: nextRetry,
      });
    } else {
      // Mark as FAILED after exceeding retries
      console.error(`[ImageWorker] Job ${job.jobId} exceeded max retries. Marking FAILED.`);
      await prisma.dropMedia.update({
        where: { id: mediaId },
        data: {
          status: MEDIA_STATUS.FAILED,
          errorMessage: errorMsg,
        },
      });
    }

    throw error;
  }
}

/**
 * Start the Image Processing Worker daemon
 */
export async function startImageWorker(): Promise<void> {
  console.log('[ImageWorker] Initializing worker service...');

  // Register with local fallback in case RabbitMQ is not online
  registerLocalWorkerHandler(executeImageProcessingJob);

  const channel: Channel | null = await getRabbitChannel();

  if (!channel) {
    console.log('[ImageWorker] Running in local worker mode (in-memory queue active).');
    return;
  }

  // Set QoS prefetch count to 1 for controlled memory footprint
  await channel.prefetch(1);

  console.log(`[ImageWorker] Listening for media jobs on queue: ${RABBITMQ_QUEUE_NAME}...`);

  await channel.consume(
    RABBITMQ_QUEUE_NAME,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const payload: MediaJobPayload = JSON.parse(msg.content.toString());
        await executeImageProcessingJob(payload);
        channel.ack(msg);
      } catch (err) {
        console.error('[ImageWorker] Job failed, acknowledging RabbitMQ to prevent stuck message (retry handled in logic):', err);
        channel.ack(msg);
      }
    },
    { noAck: false }
  );
}

// Auto-start worker in background when imported in the app runtime (skip during build)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  startImageWorker().catch((err) => {
    console.warn('[ImageWorker] Initial worker start warning (fallback active):', err.message);
  });
}

