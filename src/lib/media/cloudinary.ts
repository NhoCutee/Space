import { v2 as cloudinary } from 'cloudinary';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { CloudinaryUploadResult, ProcessedVariantResult } from './types';
import { ImageVariantKey } from './constants';

function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
    return cloudinary;
  }

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return cloudinary;
  }

  return null;
}

/**
 * Upload an already processed and compressed buffer directly to Cloudinary.
 * No Cloudinary transformations are applied — the image is pre-rendered by Sharp.
 * Uses deterministic public IDs for idempotent retries.
 */
export async function uploadVariantToCloudinary(
  mediaId: string,
  variant: ProcessedVariantResult,
  dropId?: string
): Promise<CloudinaryUploadResult> {
  // Deterministic public ID structure: spaces/drops/{mediaId}/{variantKey}
  const folder = dropId ? `spaces/drops/${dropId}/${mediaId}` : `spaces/drops/${mediaId}`;
  const publicId = `${folder}/${variant.variantKey}`;
  const cld = getCloudinary();

  if (cld) {
    return new Promise((resolve, reject) => {
      const uploadStream = cld.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          invalidate: true,
          resource_type: 'image',
          format: variant.format,
          // CRITICAL: No transformations requested; preserve exact Sharp pre-processed bytes
        },
        (error, result) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary upload failed for ${publicId}: ${error?.message || 'Unknown error'}`));
          }
          resolve({
            variantKey: variant.variantKey,
            publicId: result.public_id,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(variant.buffer);
    });
  }

  // Local CDN Storage Fallback (When Cloudinary credentials are not configured in local dev/offline tests)
  // Stores into public/cdn/... and serves deterministic URLs
  const cdnDir = join(process.cwd(), 'public', 'cdn', folder);
  await mkdir(cdnDir, { recursive: true });
  const filename = `${variant.variantKey}.${variant.format}`;
  const filePath = join(cdnDir, filename);
  await writeFile(filePath, variant.buffer);

  const localCdnUrl = `/cdn/${folder}/${filename}`;

  return {
    variantKey: variant.variantKey,
    publicId,
    secureUrl: localCdnUrl,
    width: variant.width,
    height: variant.height,
    format: variant.format,
    bytes: variant.sizeBytes,
  };
}

/**
 * Upload all pre-processed variants to Cloudinary in parallel.
 */
export async function uploadAllVariants<K extends ImageVariantKey = ImageVariantKey>(
  mediaId: string,
  variants: Record<K, ProcessedVariantResult>,
  dropId?: string
): Promise<Record<K, CloudinaryUploadResult>> {
  const keys = Object.keys(variants) as K[];
  const uploadPromises = keys.map((key) => uploadVariantToCloudinary(mediaId, variants[key], dropId));

  const results = await Promise.all(uploadPromises);

  const output = {} as Record<K, CloudinaryUploadResult>;
  for (const res of results) {
    output[res.variantKey as K] = res;
  }

  return output;
}

export function isCloudinaryLive(): boolean {
  return Boolean(getCloudinary());
}

/**
 * Upload a processed avatar WebP buffer to Cloudinary or local CDN storage.
 */
export async function uploadAvatarImage(userId: string, buffer: Buffer): Promise<string> {
  const cld = getCloudinary();
  const folder = 'spaces/avatars';
  const publicId = `${folder}/${userId}`;

  if (cld) {
    return new Promise((resolve, reject) => {
      const uploadStream = cld.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          invalidate: true,
          resource_type: 'image',
          format: 'webp',
        },
        (error, result) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary avatar upload failed: ${error?.message || 'Unknown error'}`));
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }

  // Local storage fallback
  const cdnDir = join(process.cwd(), 'public', 'cdn', 'avatars');
  await mkdir(cdnDir, { recursive: true });
  const filename = `${userId}-${Date.now()}.webp`;
  const filePath = join(cdnDir, filename);
  await writeFile(filePath, buffer);

  return `/cdn/avatars/${filename}`;
}
