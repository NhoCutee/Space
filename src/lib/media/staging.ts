import { join } from 'path';
import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const STAGING_DIR = join(process.cwd(), 'tmp', 'staging');

export async function stageOriginalUpload(
  buffer: Buffer,
  originalFilename: string
): Promise<{ sourcePath: string; sizeBytes: number }> {
  await mkdir(STAGING_DIR, { recursive: true });

  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ext.replace(/[^a-z0-9]/g, '');
  const stagedFilename = `${randomUUID()}.${cleanExt}`;
  const sourcePath = join(STAGING_DIR, stagedFilename);

  await writeFile(sourcePath, buffer);
  const fileStat = await stat(sourcePath);

  return {
    sourcePath,
    sizeBytes: fileStat.size,
  };
}

export async function deleteStagedOriginal(sourcePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!existsSync(sourcePath)) {
      return { success: true };
    }
    await unlink(sourcePath);
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
