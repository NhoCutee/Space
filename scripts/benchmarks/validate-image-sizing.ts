/**
 * Comprehensive Image Sizing Validation and Benchmark Suite
 * Spaces — Visual Social Commons
 */

import sharp from 'sharp';
import { processImageSource } from '../../src/lib/media/processor';
import {
  IMAGE_SIZE_DETAIL_WIDTH,
  IMAGE_SIZE_LARGE_WIDTH,
  IMAGE_SIZE_MEDIUM_WIDTH,
  IMAGE_SIZE_SMALL_WIDTH,
  IMAGE_SIZE_THUMB_WIDTH,
  AVATAR_SIZE,
} from '../../src/lib/media/constants';
import {
  getMediaVariantUrl,
  getMediaSrcSet,
  getResponsiveImageProps,
  RESPONSIVE_SIZES,
} from '../../src/lib/media/responsive';

async function runValidation() {
  console.log('========================================================================');
  console.log('SPACES IMAGE SIZING & RESPONSIVE DELIVERY VALIDATION SUITE');
  console.log('========================================================================\n');

  console.log('Target Dimension Specifications:');
  console.log(`- Detail:  ${IMAGE_SIZE_DETAIL_WIDTH}px (WebP q85, inside fit, no enlargement)`);
  console.log(`- Large:   ${IMAGE_SIZE_LARGE_WIDTH}px (WebP q85, inside fit, no enlargement)`);
  console.log(`- Medium:  ${IMAGE_SIZE_MEDIUM_WIDTH}px (WebP q82, inside fit, no enlargement)`);
  console.log(`- Small:   ${IMAGE_SIZE_SMALL_WIDTH}px (WebP q82, inside fit, no enlargement)`);
  console.log(`- Thumb:   ${IMAGE_SIZE_THUMB_WIDTH}px (WebP q80, inside fit, no enlargement)`);
  console.log(`- Avatar:  ${AVATAR_SIZE}x${AVATAR_SIZE}px (WebP q85, cover crop)\n`);

  // -------------------------------------------------------------------------
  // 1. Aspect Ratio Preservation & Dimension Validation across image types
  // -------------------------------------------------------------------------
  console.log('--- 1. TESTING VARIANTS ACROSS IMAGE GEOMETRIES ---');

  const testCases = [
    { name: 'Landscape Photo', w: 4000, h: 3000, expectedRatio: 1.333 },
    { name: 'Portrait Photo',  w: 3000, h: 4000, expectedRatio: 0.750 },
    { name: 'Square Artwork',  w: 3000, h: 3000, expectedRatio: 1.000 },
    { name: 'High-Res Detail', w: 5000, h: 4000, expectedRatio: 1.250 },
  ];

  for (const tc of testCases) {
    const buf = await sharp({
      create: { width: tc.w, height: tc.h, channels: 3, background: { r: 120, g: 150, b: 180 } },
    }).jpeg().toBuffer();

    const result = await processImageSource(buf);

    console.log(`\n[${tc.name}: ${tc.w}x${tc.h} (ratio: ${tc.expectedRatio})]`);
    console.log(`  Original: ${result.originalDimensions.width}x${result.originalDimensions.height}, ratio ${result.originalDimensions.aspectRatio}`);

    for (const key of ['detail', 'large', 'medium', 'small', 'thumb'] as const) {
      const v = result.variants[key];
      const ratioDiff = Math.abs(v.aspectRatio - tc.expectedRatio);
      if (ratioDiff > 0.01) {
        throw new Error(`Aspect ratio distortion detected in ${key}: got ${v.aspectRatio}, expected ~${tc.expectedRatio}`);
      }
      console.log(`  - ${key.padEnd(7)}: ${v.width}x${v.height} (${(v.sizeBytes / 1024).toFixed(1)} KB, format: ${v.format}, ratio: ${v.aspectRatio})`);
    }
  }

  // -------------------------------------------------------------------------
  // 2. No Upscaling Verification (Crucial Requirement!)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. TESTING NO-UPSCALING SAFEGUARD (Small input: 200x150) ---');
  const smallSourceBuf = await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 200, g: 100, b: 100 } },
  }).jpeg().toBuffer();

  const smallResult = await processImageSource(smallSourceBuf);
  console.log(`Original: 200x150`);
  for (const key of ['detail', 'large', 'medium', 'small', 'thumb'] as const) {
    const v = smallResult.variants[key];
    console.log(`  - ${key.padEnd(7)}: ${v.width}x${v.height} (${(v.sizeBytes / 1024).toFixed(1)} KB)`);
    if (v.width > 200 || v.height > 150) {
      throw new Error(`FAIL: Variant ${key} was upscaled to ${v.width}x${v.height}! withoutEnlargement must be true!`);
    }
  }
  console.log('✓ PASS: Zero upscaling detected. Small original retained native bounds.\n');

  // -------------------------------------------------------------------------
  // 3. Bandwidth & Payload Comparison (Before vs After)
  // -------------------------------------------------------------------------
  console.log('--- 3. MEASURING BANDWIDTH IMPACT: OLD STRATEGY VS NEW STRATEGY ---');

  // Generate realistic complex sample image using pseudo-random buffer
  import('crypto');
  const crypto = await import('crypto');
  // Generate a multi-color gradient pattern buffer for realistic photographic entropy
  const sampleBuf = await sharp(crypto.randomBytes(1800 * 1200 * 3), {
    raw: { width: 1800, height: 1200, channels: 3 },
  })
    .resize(3600, 2400, { kernel: 'lanczos3' })
    .jpeg({ quality: 90 })
    .toBuffer();

  const sampleProc = await processImageSource(sampleBuf);

  // In the old system, everything fetched large (1200px) or raw original
  const oldLargeBytes = (await sharp(sampleBuf).resize(1200, null, { fit: 'inside' }).webp({ quality: 85 }).toBuffer()).length;
  const newThumbBytes = sampleProc.variants.thumb.sizeBytes;
  const newSmallBytes = sampleProc.variants.small.sizeBytes;
  const newMediumBytes = sampleProc.variants.medium.sizeBytes;
  const newLargeBytes = sampleProc.variants.large.sizeBytes;
  const newDetailBytes = sampleProc.variants.detail.sizeBytes;

  const scenarios = [
    {
      context: 'Search Dialog Drop Icon (40px CSS)',
      oldBytes: oldLargeBytes,
      newBytes: newThumbBytes,
      servedVariant: 'thumb (240px)',
    },
    {
      context: 'Curated Rail Sample Drop (80px CSS)',
      oldBytes: oldLargeBytes,
      newBytes: newThumbBytes,
      servedVariant: 'thumb (240px)',
    },
    {
      context: 'Drop Detail Viewer Ribbon (64-80px CSS)',
      oldBytes: oldLargeBytes,
      newBytes: newThumbBytes,
      servedVariant: 'thumb (240px)',
    },
    {
      context: 'Desktop 4-Col Masonry Card (290px CSS @ DPR 2)',
      oldBytes: oldLargeBytes,
      newBytes: newSmallBytes,
      servedVariant: 'small (640px)',
    },
    {
      context: 'Mobile 1-Col Feed Card (358px CSS @ DPR 1.8)',
      oldBytes: oldLargeBytes,
      newBytes: newSmallBytes,
      servedVariant: 'small (640px)',
    },
    {
      context: 'Tablet 2-Col Masonry Card (348px CSS @ DPR 2)',
      oldBytes: oldLargeBytes,
      newBytes: newMediumBytes,
      servedVariant: 'medium (960px)',
    },
    {
      context: 'Drop Detail Main Stage (805px CSS @ DPR 1.8)',
      oldBytes: oldLargeBytes,
      newBytes: newLargeBytes,
      servedVariant: 'large (1440px)',
    },
    {
      context: 'Fullscreen Lightbox Modal (1152px CSS @ DPR 2)',
      oldBytes: oldLargeBytes,
      newBytes: newDetailBytes,
      servedVariant: 'detail (1920px)',
    },
  ];

  console.log('| UI Context | Old Served | Old Size | New Served | New Size | Bandwidth Delta |');
  console.log('|---|---|---:|---|---:|---:|');
  for (const sc of scenarios) {
    const delta = (((sc.newBytes - sc.oldBytes) / sc.oldBytes) * 100).toFixed(1);
    const sign = Number(delta) > 0 ? '+' : '';
    console.log(
      `| ${sc.context} | 1200px large | ${(sc.oldBytes / 1024).toFixed(1)} KB | ${sc.servedVariant} | ${(sc.newBytes / 1024).toFixed(1)} KB | ${sign}${delta}% |`
    );
  }

  // -------------------------------------------------------------------------
  // 4. Backward Compatibility Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 4. TESTING BACKWARD COMPATIBILITY RESOLUTION ---');

  // Case A: Modern record with all variants
  const modernMedia = {
    url: 'https://cdn.example.com/drops/media-1/large.webp',
    variants: JSON.stringify({
      detail: 'https://cdn.example.com/drops/media-1/detail.webp',
      large: 'https://cdn.example.com/drops/media-1/large.webp',
      medium: 'https://cdn.example.com/drops/media-1/medium.webp',
      small: 'https://cdn.example.com/drops/media-1/small.webp',
      thumb: 'https://cdn.example.com/drops/media-1/thumb.webp',
    }),
  };

  console.log('Case A: Modern Media Record');
  console.log('  Resolved thumb:  ', getMediaVariantUrl(modernMedia, 'thumb'));
  console.log('  Resolved small:  ', getMediaVariantUrl(modernMedia, 'small'));
  console.log('  Resolved medium: ', getMediaVariantUrl(modernMedia, 'medium'));
  console.log('  Resolved large:  ', getMediaVariantUrl(modernMedia, 'large'));
  console.log('  Resolved detail: ', getMediaVariantUrl(modernMedia, 'detail'));
  console.log('  Generated srcSet:', getMediaSrcSet(modernMedia));

  // Case B: Legacy record with old variant keys { large, medium, small, thumbnail, localThumbnail }
  const legacyMedia = {
    url: 'https://cdn.example.com/drops/legacy-1/large.webp',
    variants: JSON.stringify({
      large: 'https://cdn.example.com/drops/legacy-1/large.webp',
      medium: 'https://cdn.example.com/drops/legacy-1/medium.webp',
      small: 'https://cdn.example.com/drops/legacy-1/small.webp',
      thumbnail: 'https://cdn.example.com/drops/legacy-1/thumbnail.webp',
      localThumbnail: 'https://cdn.example.com/drops/legacy-1/local_thumbnail.webp',
    }),
  };

  console.log('\nCase B: Legacy Media Record (old keys: thumbnail, localThumbnail)');
  const resolvedLegacyThumb = getMediaVariantUrl(legacyMedia, 'thumb');
  const resolvedLegacyDetail = getMediaVariantUrl(legacyMedia, 'detail');
  console.log('  Resolved thumb (mapped from thumbnail):', resolvedLegacyThumb);
  console.log('  Resolved detail (fallback to large):   ', resolvedLegacyDetail);
  if (!resolvedLegacyThumb.includes('thumbnail')) {
    throw new Error('FAIL: Legacy thumbnail was not resolved for thumb variant!');
  }

  // Case C: Raw URL record without variants JSON
  const rawMedia = {
    url: 'https://images.unsplash.com/photo-example.jpg',
    variants: null,
  };

  console.log('\nCase C: Raw External URL Record (zero variants)');
  console.log('  Resolved thumb fallback: ', getMediaVariantUrl(rawMedia, 'thumb'));
  console.log('  Resolved detail fallback:', getMediaVariantUrl(rawMedia, 'detail'));
  const rawProps = getResponsiveImageProps(rawMedia);
  console.log('  Responsive props src:    ', rawProps.src);
  console.log('  Responsive props srcSet: ', rawProps.srcSet || '(none - graceful fallback)');

  console.log('\n========================================================================');
  console.log('ALL VALIDATION CHECKS PASSED PERFECTLY!');
  console.log('========================================================================');
}

runValidation().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
