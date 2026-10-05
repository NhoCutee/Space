import sharp from 'sharp';
import { readFile } from 'fs/promises';
import {
  IMAGE_VARIANTS_CONFIG,
  ImageVariantKey,
} from './constants';
import { ProcessedVariantResult } from './types';

export interface ImageProcessingResult {
  originalDimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  blurhash?: string;
  variants: Record<ImageVariantKey, ProcessedVariantResult>;
}

/**
 * Server-side Sharp Image Processor
 * Responsible for decoding, normalizing EXIF, resizing to exact product variant constants,
 * and encoding WebP assets prior to permanent storage.
 * Cloudinary transformations are NEVER used for this pipeline.
 */
export async function processImageSource(
  sourcePathOrBuffer: string | Buffer
): Promise<ImageProcessingResult> {
  const inputBuffer = typeof sourcePathOrBuffer === 'string'
    ? await readFile(sourcePathOrBuffer)
    : sourcePathOrBuffer;

  // 1. Initial metadata inspection & EXIF normalization (decode once)
  const basePipeline = sharp(inputBuffer).rotate();
  const metadata = await basePipeline.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid or unreadable image file: missing dimensions');
  }

  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const originalAspectRatio = originalHeight > 0
    ? Number((originalWidth / originalHeight).toFixed(3))
    : 1.5;

  // 2. Generate all 5 required variants + blurhash placeholder concurrently with controlled parallel pipeline
  const [
    largeResult,
    mediumResult,
    smallResult,
    thumbnailResult,
    localThumbnailResult,
    blurhashBuf,
  ] = await Promise.all([
    // Variant 1: Large (1200px width, aspect ratio preserved, no upscaling, WebP q85)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.large.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.large.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant 2: Medium (640px width, aspect ratio preserved, no upscaling, WebP q80)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.medium.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.medium.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant 3: Small (250px width, aspect ratio preserved, no upscaling, WebP q80)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.small.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.small.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant 4: Standard Thumbnail (500px width, aspect ratio preserved, no upscaling, WebP q80)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.thumbnail.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.thumbnail.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant 5: Local Thumbnail (Fixed 240x200, center crop cover, WebP q80)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.localThumbnail.width,
        height: IMAGE_VARIANTS_CONFIG.localThumbnail.height,
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.localThumbnail.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Tiny blur placeholder
    sharp(inputBuffer)
      .rotate()
      .resize(32, 32, { fit: 'inside' })
      .webp({ quality: 20, effort: 2 })
      .toBuffer()
      .catch(() => null),
  ]);

  const variants: Record<ImageVariantKey, ProcessedVariantResult> = {
    large: {
      variantKey: 'large',
      width: largeResult.info.width,
      height: largeResult.info.height,
      aspectRatio: Number((largeResult.info.width / largeResult.info.height).toFixed(3)),
      format: largeResult.info.format,
      buffer: largeResult.data,
      sizeBytes: largeResult.data.length,
    },
    medium: {
      variantKey: 'medium',
      width: mediumResult.info.width,
      height: mediumResult.info.height,
      aspectRatio: Number((mediumResult.info.width / mediumResult.info.height).toFixed(3)),
      format: mediumResult.info.format,
      buffer: mediumResult.data,
      sizeBytes: mediumResult.data.length,
    },
    small: {
      variantKey: 'small',
      width: smallResult.info.width,
      height: smallResult.info.height,
      aspectRatio: Number((smallResult.info.width / smallResult.info.height).toFixed(3)),
      format: smallResult.info.format,
      buffer: smallResult.data,
      sizeBytes: smallResult.data.length,
    },
    thumbnail: {
      variantKey: 'thumbnail',
      width: thumbnailResult.info.width,
      height: thumbnailResult.info.height,
      aspectRatio: Number((thumbnailResult.info.width / thumbnailResult.info.height).toFixed(3)),
      format: thumbnailResult.info.format,
      buffer: thumbnailResult.data,
      sizeBytes: thumbnailResult.data.length,
    },
    localThumbnail: {
      variantKey: 'localThumbnail',
      width: localThumbnailResult.info.width,
      height: localThumbnailResult.info.height,
      aspectRatio: Number((localThumbnailResult.info.width / localThumbnailResult.info.height).toFixed(3)),
      format: localThumbnailResult.info.format,
      buffer: localThumbnailResult.data,
      sizeBytes: localThumbnailResult.data.length,
    },
  };

  const blurhash = blurhashBuf
    ? `data:image/webp;base64,${blurhashBuf.toString('base64')}`
    : undefined;

  return {
    originalDimensions: {
      width: originalWidth,
      height: originalHeight,
      aspectRatio: originalAspectRatio,
    },
    blurhash,
    variants,
  };
}
