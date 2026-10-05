import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });
  }

  const media = await prisma.dropMedia.findUnique({
    where: { id },
  });

  if (!media) {
    return NextResponse.json({ error: 'Media item not found' }, { status: 404 });
  }

  let parsedVariants: Record<string, string> | null = null;
  if (media.variants) {
    try {
      parsedVariants = JSON.parse(media.variants);
    } catch {
      parsedVariants = null;
    }
  }

  return NextResponse.json({
    mediaId: media.id,
    status: media.status,
    url: media.url,
    thumbnailUrl: parsedVariants?.thumbnail || parsedVariants?.small || media.url,
    width: media.width,
    height: media.height,
    aspectRatio: media.aspectRatio,
    blurhash: media.blurhash,
    variants: parsedVariants,
    errorMessage: media.errorMessage,
  });
}
