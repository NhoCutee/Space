import { NextRequest, NextResponse } from 'next/server';
import {
  getChannelName,
  subscribeToCommentChannel,
  CommentRealtimeEvent,
} from '@/lib/realtime/commentEvents';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const spaceId = searchParams.get('spaceId');
  const dropId = searchParams.get('dropId');

  if (!spaceId && !dropId) {
    return NextResponse.json(
      { error: 'Missing target: specify spaceId or dropId' },
      { status: 400 }
    );
  }

  // Validate target existence
  if (spaceId) {
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { id: true },
    });
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }
  } else if (dropId) {
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      select: { id: true },
    });
    if (!drop) {
      return NextResponse.json({ error: 'Drop not found' }, { status: 404 });
    }
  }

  const channel = getChannelName({ spaceId, dropId });
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection handshake
      const handshake = `data: ${JSON.stringify({
        type: 'connected',
        channel,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(handshake));

      // 2. Subscribe to scoped channel events
      const listener = (event: CommentRealtimeEvent) => {
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might be closed
        }
      };

      unsubscribe = subscribeToCommentChannel(channel, listener);

      // 3. Heartbeat ping every 25 seconds to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          // Stream closed
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 25000);

      // 4. Handle client abort/disconnect
      req.signal.addEventListener('abort', () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
