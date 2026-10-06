/**
 * Media Processing Architecture Constants
 * Spaces — Visual Social Commons
 */

// Target Image Variant Constants (Product Requirements)
export const IMAGE_SIZE_LARGE_WIDTH = 1200;
export const IMAGE_SIZE_MEDIUM_WIDTH = 640;
export const IMAGE_SIZE_SMALL_WIDTH = 250;
export const LOCAL_THUMBNAIL_WIDTH = 240;
export const LOCAL_THUMBNAIL_HEIGHT = 200;
export const THUMBNAIL_WIDTH = 500;

export const IMAGE_VARIANTS_CONFIG = {
  large: {
    name: 'large',
    width: IMAGE_SIZE_LARGE_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 85,
    format: 'webp' as const,
    suffix: 'large',
    description: 'Full-width visual presentation in Drop detail view and lightbox modal',
  },
  medium: {
    name: 'medium',
    width: IMAGE_SIZE_MEDIUM_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 80,
    format: 'webp' as const,
    suffix: 'medium',
    description: 'Feed view, tablet viewport, and 2-column masonry layouts',
  },
  small: {
    name: 'small',
    width: IMAGE_SIZE_SMALL_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 80,
    format: 'webp' as const,
    suffix: 'small',
    description: 'Mobile feeds, compact lists, and user profile media grids',
  },
  thumbnail: {
    name: 'thumbnail',
    width: THUMBNAIL_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 80,
    format: 'webp' as const,
    suffix: 'thumbnail',
    description: 'Standard 500px aspect-preserved thumbnail for collections and search cards',
  },
  localThumbnail: {
    name: 'localThumbnail',
    width: LOCAL_THUMBNAIL_WIDTH,
    height: LOCAL_THUMBNAIL_HEIGHT,
    fit: 'cover' as const, // Explicit decision: 'cover' with center crop for fixed 240x200 card slots
    withoutEnlargement: false,
    quality: 80,
    format: 'webp' as const,
    suffix: 'local_thumbnail',
    description: 'Fixed 240x200 card thumbnail (center crop cover) for compact fixed-aspect slots',
  },
} as const;

export type ImageVariantKey = keyof typeof IMAGE_VARIANTS_CONFIG;

// RabbitMQ Topology Constants
export const RABBITMQ_QUEUE_NAME = process.env.RABBITMQ_QUEUE || 'spaces_image_processing';
export const RABBITMQ_EXCHANGE_NAME = 'spaces_media_exchange';
export const RABBITMQ_ROUTING_KEY = 'media.image.process';
export const RABBITMQ_DLX_EXCHANGE = 'spaces_media_dlx';
export const RABBITMQ_DLQ_NAME = 'spaces_image_processing_dlq';

// Processing Statuses
export const MEDIA_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const;

export type MediaStatusType = typeof MEDIA_STATUS[keyof typeof MEDIA_STATUS];

// Retry & Limits
export const MAX_RETRY_COUNT = 3;
export const MAX_UPLOAD_FILE_SIZE = 15 * 1024 * 1024; // 15MB safe limit
