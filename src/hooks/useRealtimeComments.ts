'use client';

import { useEffect, useRef, useState } from 'react';
import { CommentWithReplies } from '@/actions/comments';
import { CommentRealtimeEvent } from '@/lib/realtime/commentEvents';

interface UseRealtimeCommentsOptions {
  spaceId?: string | null;
  dropId?: string | null;
  onCommentCreated?: (comment: CommentWithReplies) => void;
  onCommentUpdated?: (comment: CommentWithReplies) => void;
  onCommentDeleted?: (
    commentId: string,
    parentId?: string | null,
    deletedCount?: number,
    isSoftDeleted?: boolean
  ) => void;
  onCommentReacted?: (
    commentId: string,
    reactionsCount: number,
    parentId?: string | null
  ) => void;
}

export function useRealtimeComments({
  spaceId,
  dropId,
  onCommentCreated,
  onCommentUpdated,
  onCommentDeleted,
  onCommentReacted,
}: UseRealtimeCommentsOptions) {
  const [isConnected, setIsConnected] = useState(false);

  // Keep callback references stable to prevent unnecessary reconnections
  const onCreatedRef = useRef(onCommentCreated);
  onCreatedRef.current = onCommentCreated;

  const onUpdatedRef = useRef(onCommentUpdated);
  onUpdatedRef.current = onCommentUpdated;

  const onDeletedRef = useRef(onCommentDeleted);
  onDeletedRef.current = onCommentDeleted;

  const onReactedRef = useRef(onCommentReacted);
  onReactedRef.current = onCommentReacted;

  useEffect(() => {
    if (!spaceId && !dropId) return;

    const query = spaceId ? `spaceId=${encodeURIComponent(spaceId)}` : `dropId=${encodeURIComponent(dropId!)}`;
    const url = `/api/realtime/comments?${query}`;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;

      try {
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            if (!e.data || e.data === 'ping') return;
            const data: CommentRealtimeEvent | { type: 'connected' } = JSON.parse(e.data);

            if (data.type === 'connected') {
              setIsConnected(true);
              return;
            }

            if (data.type === 'created' && data.comment) {
              onCreatedRef.current?.(data.comment);
            } else if (data.type === 'updated' && data.comment) {
              onUpdatedRef.current?.(data.comment);
            } else if (data.type === 'deleted' && data.commentId) {
              onDeletedRef.current?.(
                data.commentId,
                data.parentId,
                data.deletedCount,
                data.isSoftDeleted
              );
            } else if (data.type === 'reacted' && data.commentId) {
              onReactedRef.current?.(
                data.commentId,
                data.reactionsCount ?? 0,
                data.parentId
              );
            }
          } catch (err) {
            console.error('[Realtime] Failed to parse message:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Attempt reconnect after 3 seconds if not unmounted
          if (!isCancelled) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.error('[Realtime] Connection error:', err);
        if (!isCancelled) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      setIsConnected(false);
    };
  }, [spaceId, dropId]);

  return { isConnected };
}
