import { ImageVariantKey, MediaStatusType } from './constants';

export interface MediaJobPayload {
  jobId: string;
  mediaId: string;
  dropId?: string;
  sourcePath: string; // Absolute path to the temporary staged original
  originalFilename: string;
  mimeType: string;
  retryCount: number;
  createdAt: string;
}

export interface ProcessedVariantResult {
  variantKey: ImageVariantKey;
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
  buffer: Buffer;
  sizeBytes: number;
}

export interface CloudinaryUploadResult {
  variantKey: ImageVariantKey;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface ProcessedMediaOutput {
  mediaId: string;
  originalDimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  blurhash?: string;
  variants: Record<ImageVariantKey, CloudinaryUploadResult>;
}

export interface MediaStatusResponse {
  mediaId: string;
  status: MediaStatusType;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  variants?: Record<string, string>;
  errorMessage?: string;
}
