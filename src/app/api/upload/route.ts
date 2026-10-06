import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { validateRequestOrigin } from '@/lib/security/csrf';
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

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/upload',
    description: 'Spaces Media Staging and Upload API',
  });
}

export async function POST(req: NextRequest) {
  // 1. CSRF Verification
  const csrfCheck = validateRequestOrigin(req);
  if (!csrfCheck.valid) {
    const { logSecurityEvent } = await import('@/lib/security/logger');
    logSecurityEvent({
      event: 'CSRF_VIOLATION',
      severity: 'WARN',
      details: { reason: csrfCheck.reason, path: '/api/upload' },
    });
    return NextResponse.json(
      { error: `Cross-site request blocked: ${csrfCheck.reason}` },
      { status: 403 }
    );
  }

  // 2. Authentication Enforcement
  const user = await getCurrentUser();
  if (!user) {
    const { logSecurityEvent } = await import('@/lib/security/logger');
    logSecurityEvent({
      event: 'AUTH_UNAUTHORIZED_ACCESS',
      severity: 'WARN',
      details: { path: '/api/upload', method: 'POST' },
    });
    return NextResponse.json(
      { error: 'Unauthorized: Authentication required to upload media' },
      { status: 401 }
    );
  }

  // 3. Rate Limiting Protection (Max 10 uploads/min per user)
  const { checkRateLimit, RATE_LIMIT_PRESETS } = await import('@/lib/security/rateLimit');
  const uploadLimit = await checkRateLimit(`upload:${user.id}`, RATE_LIMIT_PRESETS.UPLOAD);
  if (!uploadLimit.allowed) {
    const retryAfter = Math.ceil((uploadLimit.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Upload rate limit reached. Please wait ${retryAfter} seconds.` },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const dropId = (formData.get('dropId') as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    // 3. Client Header Sanity Check
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // 4. File Size Limit
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 5. Binary Magic Bytes Inspection and Isolated Staging
    // Never trusts client-supplied Content-Type or file extension
    let stagedResult;
    try {
      stagedResult = await stageOriginalUpload(buffer, file.name);
    } catch (stagingErr: unknown) {
      const msg = stagingErr instanceof Error ? stagingErr.message : 'Invalid image file';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { sourcePath, mime } = stagedResult;

    // 6. Create initial database record in PENDING state
    const mediaId = randomUUID();
    await prisma.dropMedia.create({
      data: {
        id: mediaId,
        dropId: dropId || null,
        status: MEDIA_STATUS.PENDING,
        url: '',
      },
    });

    // 7. Create lightweight RabbitMQ Job payload (No binary data or secrets in queue)
    const job: MediaJobPayload = {
      jobId: randomUUID(),
      mediaId,
      dropId,
      sourcePath,
      originalFilename: `upload-${mediaId}`,
      mimeType: mime,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    // 8. Dispatch lightweight job to RabbitMQ queue
    await publishMediaJob(job);

    // 9. Return immediate PROCESSING response
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
