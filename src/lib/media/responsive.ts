/**
 * Responsive Image Delivery Utilities
 * Spaces — Visual Social Commons
 *
 * Provides width-based responsive srcSet generation, variant resolution,
 * and standard UI display sizes based on real device pixel ratios (DPR).
 * Safe for both Client and Server Components (zero Node native dependencies).
 */

import {
  IMAGE_SIZE_THUMB_WIDTH,
  IMAGE_SIZE_SMALL_WIDTH,
  IMAGE_SIZE_MEDIUM_WIDTH,
  IMAGE_SIZE_LARGE_WIDTH,
  IMAGE_SIZE_DETAIL_WIDTH,
} from './constants';

export type ResponsiveVariantKey = 'thumb' | 'small' | 'medium' | 'large' | 'detail';

export interface MediaLike {
  url?: string | null;
  variants?: string | Record<string, string> | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
}

/**
 * Standard preset sizes attribute strings for UI rendering contexts
 */
export const RESPONSIVE_SIZES = {
  // Feed & Space Masonry: 1 col on mobile, 2 cols on tablet, 3-4 cols on desktop
  masonryCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw',

  // Drop Detail Main Stage: col-span-8 in 7xl container
  detailStage: '(max-width: 768px) 100vw, (max-width: 1280px) 67vw, 840px',

  // Space & Collection Grid Cards: 1-3 cols
  gridCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px',

  // Quadrant item inside collection card or 3-col preview strip
  cardThumbnail: '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 190px',

  // Micro-thumbnail (curated rail sample drop, viewer ribbon, search dialog)
  microThumb: '80px',

  // Fullscreen Lightbox
  lightbox: '100vw',
} as const;

/**
 * Safely parse variants JSON if stored as string
 */
export function parseMediaVariants(
  variants: string | Record<string, string> | null | undefined
): Record<string, string> | null {
  if (!variants) return null;
  if (typeof variants === 'object') return variants;
  if (typeof variants === 'string') {
    try {
      return JSON.parse(variants);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Resolve the optimal variant URL for a specific UI display context,
 * with graceful fallback to legacy keys and default URL.
 */
export function getMediaVariantUrl(
  media: MediaLike | null | undefined,
  targetVariant: ResponsiveVariantKey,
  fallbackUrl = '/placeholder.jpg'
): string {
  if (!media) return fallbackUrl;

  const parsed = parseMediaVariants(media.variants);
  const defaultUrl = media.url || fallbackUrl;

  if (!parsed) return defaultUrl;

  switch (targetVariant) {
    case 'thumb':
      return (
        parsed.thumb ||
        parsed.thumbnail ||
        parsed.localThumbnail ||
        parsed.small ||
        defaultUrl
      );

    case 'small':
      return (
        parsed.small ||
        parsed.thumb ||
        parsed.medium ||
        parsed.thumbnail ||
        defaultUrl
      );

    case 'medium':
      return (
        parsed.medium ||
        parsed.small ||
        parsed.large ||
        defaultUrl
      );

    case 'large':
      return (
        parsed.large ||
        parsed.medium ||
        parsed.detail ||
        defaultUrl
      );

    case 'detail':
      return (
        parsed.detail ||
        parsed.large ||
        defaultUrl
      );

    default:
      return defaultUrl;
  }
}

/**
 * Generate a responsive srcSet string with width descriptors for content images.
 * Preserves aspect ratio across all width descriptors.
 */
export function getMediaSrcSet(media: MediaLike | null | undefined): string | undefined {
  if (!media) return undefined;

  const parsed = parseMediaVariants(media.variants);
  if (!parsed) return undefined;

  const entries: Array<{ url: string; width: number }> = [];

  const addVariant = (url: string | undefined, width: number) => {
    if (url && !entries.some((e) => e.url === url)) {
      entries.push({ url, width });
    }
  };

  // Add variants in ascending width order
  if (parsed.thumb) addVariant(parsed.thumb, IMAGE_SIZE_THUMB_WIDTH);
  else if (parsed.thumbnail) addVariant(parsed.thumbnail, IMAGE_SIZE_THUMB_WIDTH);

  if (parsed.small) addVariant(parsed.small, IMAGE_SIZE_SMALL_WIDTH);
  if (parsed.medium) addVariant(parsed.medium, IMAGE_SIZE_MEDIUM_WIDTH);
  if (parsed.large) addVariant(parsed.large, IMAGE_SIZE_LARGE_WIDTH);
  if (parsed.detail) addVariant(parsed.detail, IMAGE_SIZE_DETAIL_WIDTH);

  // If no variants registered in entries, return undefined
  if (entries.length <= 1 && !parsed.thumb && !parsed.small && !parsed.medium) {
    return undefined;
  }

  return entries.map((e) => `${e.url} ${e.width}w`).join(', ');
}

/**
 * Helper returning complete HTML image props ({ src, srcSet, sizes })
 */
export function getResponsiveImageProps(
  media: MediaLike | null | undefined,
  options?: {
    defaultVariant?: ResponsiveVariantKey;
    sizes?: string;
    fallbackUrl?: string;
  }
): {
  src: string;
  srcSet?: string;
  sizes?: string;
} {
  const defaultVariant = options?.defaultVariant || 'small';
  const fallbackUrl = options?.fallbackUrl || '/placeholder.jpg';
  const src = getMediaVariantUrl(media, defaultVariant, fallbackUrl);
  const srcSet = getMediaSrcSet(media);
  const sizes = options?.sizes || RESPONSIVE_SIZES.masonryCard;

  return {
    src,
    srcSet,
    sizes: srcSet ? sizes : undefined,
  };
}
