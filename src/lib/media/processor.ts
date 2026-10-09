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
  const sharpSecurityOptions = {
    failOn: 'error' as const,
    limitInputPixels: 40_000_000, // 40 MP max (prevents decompression bomb DoS)
  };

  const basePipeline = sharp(inputBuffer, sharpSecurityOptions).rotate();
  const metadata = await basePipeline.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid or unreadable image file: missing dimensions');
  }

  if (metadata.width > 10000 || metadata.height > 10000) {
    throw new Error('Image dimensions exceed maximum allowed limit of 10,000x10,000 pixels');
  }

  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const originalAspectRatio = originalHeight > 0
    ? Number((originalWidth / originalHeight).toFixed(3))
    : 1.5;

  // 2. Generate responsive variants + blurhash placeholder concurrently with controlled parallel pipeline
  // No upscaling: withoutEnlargement is true for all content artwork variants
  const [
    detailResult,
    largeResult,
    mediumResult,
    smallResult,
    thumbResult,
    localThumbnailResult,
    blurhashBuf,
  ] = await Promise.all([
    // Variant: Detail (1920px width, aspect ratio preserved, no upscaling, WebP q85)
    sharp(inputBuffer, sharpSecurityOptions)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.detail.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.detail.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant: Large (1440px width, aspect ratio preserved, no upscaling, WebP q85)
    sharp(inputBuffer, sharpSecurityOptions)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.large.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.large.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant: Medium (960px width, aspect ratio preserved, no upscaling, WebP q82)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.medium.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.medium.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant: Small / Card (640px width, aspect ratio preserved, no upscaling, WebP q82)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.small.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.small.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Variant: Thumb (240px width, aspect ratio preserved, no upscaling, WebP q80)
    sharp(inputBuffer)
      .rotate()
      .resize({
        width: IMAGE_VARIANTS_CONFIG.thumb.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_VARIANTS_CONFIG.thumb.quality, effort: 3 })
      .toBuffer({ resolveWithObject: true }),

    // Legacy Local Thumbnail (Fixed 240x200, center crop cover, WebP q80) for backward compatibility
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
    detail: {
      variantKey: 'detail',
      width: detailResult.info.width,
      height: detailResult.info.height,
      aspectRatio: Number((detailResult.info.width / detailResult.info.height).toFixed(3)),
      format: detailResult.info.format,
      buffer: detailResult.data,
      sizeBytes: detailResult.data.length,
    },
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
    thumb: {
      variantKey: 'thumb',
      width: thumbResult.info.width,
      height: thumbResult.info.height,
      aspectRatio: Number((thumbResult.info.width / thumbResult.info.height).toFixed(3)),
      format: thumbResult.info.format,
      buffer: thumbResult.data,
      sizeBytes: thumbResult.data.length,
    },
    // Backward compatibility: alias thumbnail to thumb result
    thumbnail: {
      variantKey: 'thumbnail',
      width: thumbResult.info.width,
      height: thumbResult.info.height,
      aspectRatio: Number((thumbResult.info.width / thumbResult.info.height).toFixed(3)),
      format: thumbResult.info.format,
      buffer: thumbResult.data,
      sizeBytes: thumbResult.data.length,
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
