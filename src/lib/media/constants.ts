/**
 * Media Processing Architecture Constants
 * Spaces — Visual Social Commons
 */

// Target Responsive Image Variant Constants (Redesigned from UI measurements & DPR)
export const IMAGE_SIZE_THUMB_WIDTH = 240; // Micro-thumbnails, search results, drop ribbon, curated sample drops
export const IMAGE_SIZE_SMALL_WIDTH = 640; // Desktop 4-col masonry cards (290px @ DPR 2), mobile 1-col feed, collection grid quadrants
export const IMAGE_SIZE_MEDIUM_WIDTH = 960; // Tablet 2-col masonry (348px @ DPR 2), space card cover preview
export const IMAGE_SIZE_LARGE_WIDTH = 1440; // Drop detail exhibition stage (805px @ DPR 1.8), tablet full view
export const IMAGE_SIZE_DETAIL_WIDTH = 1920; // Fullscreen Lightbox modal, high-resolution visual inspection
export const AVATAR_SIZE = 256; // Standard profile avatar (96px @ DPR 2.6)

// Backward compatibility aliases
export const THUMBNAIL_WIDTH = IMAGE_SIZE_THUMB_WIDTH;
export const LOCAL_THUMBNAIL_WIDTH = 240;
export const LOCAL_THUMBNAIL_HEIGHT = 200;

export const IMAGE_VARIANTS_CONFIG = {
  detail: {
    name: 'detail',
    width: IMAGE_SIZE_DETAIL_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 85,
    format: 'webp' as const,
    suffix: 'detail',
    description: 'High-resolution presentation in fullscreen lightbox modal (1920px max, aspect preserved)',
  },
  large: {
    name: 'large',
    width: IMAGE_SIZE_LARGE_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 85,
    format: 'webp' as const,
    suffix: 'large',
    description: 'Drop detail main exhibition stage and tablet full viewport (1440px max, aspect preserved)',
  },
  medium: {
    name: 'medium',
    width: IMAGE_SIZE_MEDIUM_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 82,
    format: 'webp' as const,
    suffix: 'medium',
    description: 'Tablet 2-column masonry layouts and space cover card previews (960px max, aspect preserved)',
  },
  small: {
    name: 'small',
    width: IMAGE_SIZE_SMALL_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 82,
    format: 'webp' as const,
    suffix: 'small',
    description: 'Desktop 4-col masonry cards (290px @ DPR 2), mobile feeds, and collection quadrants (640px max)',
  },
  thumb: {
    name: 'thumb',
    width: IMAGE_SIZE_THUMB_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 80,
    format: 'webp' as const,
    suffix: 'thumb',
    description: 'Micro-thumbnails, search results, curated rail sample strips, and detail viewer ribbon (240px max)',
  },
  // Backward compatibility variants
  thumbnail: {
    name: 'thumbnail',
    width: IMAGE_SIZE_THUMB_WIDTH,
    fit: 'inside' as const,
    withoutEnlargement: true,
    quality: 80,
    format: 'webp' as const,
    suffix: 'thumbnail',
    description: 'Legacy alias for thumb variant',
  },
  localThumbnail: {
    name: 'localThumbnail',
    width: LOCAL_THUMBNAIL_WIDTH,
    height: LOCAL_THUMBNAIL_HEIGHT,
    fit: 'cover' as const,
    withoutEnlargement: false,
    quality: 80,
    format: 'webp' as const,
    suffix: 'local_thumbnail',
    description: 'Legacy 240x200 fixed crop for backward compatibility',
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
