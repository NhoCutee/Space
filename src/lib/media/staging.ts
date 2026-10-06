import { resolve } from 'path';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const STAGING_DIR = resolve(process.cwd(), 'tmp', 'staging');

export type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export interface ImageSignature {
  mime: AllowedImageMime;
  ext: string;
}

/**
 * Inspects binary magic bytes to authenticate true image format.
 * Never trusts client-supplied Content-Type headers or file extensions.
 */
export function detectImageSignature(buffer: Buffer): ImageSignature | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * Stages an uploaded file with verified magic bytes in an isolated directory.
 * Path traversal is strictly prevented via random UUID filenames and path validation.
 */
export async function stageOriginalUpload(
  buffer: Buffer,
  originalFilename?: string
): Promise<{ sourcePath: string; sizeBytes: number; mime: AllowedImageMime }> {
  void originalFilename; // Unused for filesystem path to guarantee path-traversal safety
  const signature = detectImageSignature(buffer);
  if (!signature) {
    throw new Error('Invalid file signature: file is not a supported image (JPEG, PNG, WebP, GIF)');
  }

  await mkdir(STAGING_DIR, { recursive: true });

  const stagedFilename = `${randomUUID()}.${signature.ext}`;
  const sourcePath = resolve(STAGING_DIR, stagedFilename);

  // Path traversal assertion: ensure staged file is strictly inside STAGING_DIR
  if (!sourcePath.startsWith(STAGING_DIR)) {
    throw new Error('Security error: path traversal attempt detected');
  }

  await writeFile(sourcePath, buffer);
  const fileStat = await stat(sourcePath);

  return {
    sourcePath,
    sizeBytes: fileStat.size,
    mime: signature.mime,
  };
}

export async function deleteStagedOriginal(sourcePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resolved = resolve(sourcePath);
    // Only allow deletion within STAGING_DIR
    if (!resolved.startsWith(STAGING_DIR)) {
      return { success: false, error: 'Path traversal prevented during cleanup' };
    }

    if (!existsSync(resolved)) {
      return { success: true };
    }
    await unlink(resolved);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Staging] Failed to delete staged original at ${sourcePath}:`, message);
    return { success: false, error: message };
  }
}

export function getStagingDir(): string {
  return STAGING_DIR;
}
