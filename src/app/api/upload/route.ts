import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import {
  MAX_UPLOAD_FILE_SIZE,
  MEDIA_STATUS,
  stageOriginalUpload,
  publishMediaJob,
  MediaJobPayload,
} from '@/lib/media';
import '@/lib/media/worker'; // Ensure worker daemon is initialized

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/**
 * Media Staging and Queue Dispatch Endpoint
 * Target Flow:
 * User selects image
 * → Upload API receives/stages original
 * → temporary/private storage (tmp/staging/)
 * → create processing job
 * → RabbitMQ (spaces_image_processing queue)
 * → Image Worker (Sharp generates 5 variants)
 * → upload processed variants to Cloudinary
 * → mark processing complete (READY)
 * → delete temporary original
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/upload',
    description: 'Spaces Media Staging and Upload API',
  });
}

export async function POST(req: NextRequest) {

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const dropId = (formData.get('dropId') as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Stage original in temporary/private storage
    const { sourcePath } = await stageOriginalUpload(buffer, file.name);

    // 2. Create initial database record in PENDING state
    const mediaId = randomUUID();
    await prisma.dropMedia.create({
      data: {
        id: mediaId,
        dropId: dropId || null,
        status: MEDIA_STATUS.PENDING,
        url: '',
      },
    });

    // 3. Create lightweight RabbitMQ Job payload (No binary data in queue)
    const job: MediaJobPayload = {
      jobId: randomUUID(),
      mediaId,
      dropId,
      sourcePath,
      originalFilename: file.name,
      mimeType: file.type,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    // 4. Dispatch lightweight job to RabbitMQ queue
    await publishMediaJob(job);

    // 5. Return immediate PROCESSING response without blocking HTTP connection.
    // The background image worker will independently process variants and upload to Cloudinary.
    return NextResponse.json({
      mediaId,
      status: MEDIA_STATUS.PROCESSING,
      url: '',
      message: 'Image processing queued in background',
      success: true,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[UploadAPI] File upload staging error:', errorMsg);
    return NextResponse.json({ error: 'Failed to stage image for processing' }, { status: 500 });
  }
}
