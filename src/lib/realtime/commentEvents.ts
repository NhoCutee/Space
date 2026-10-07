import { EventEmitter } from 'events';
import { CommentWithReplies } from '@/actions/comments';

export type CommentRealtimeAction = 'created' | 'updated' | 'deleted' | 'reacted';

export interface CommentRealtimeEvent {
  type: CommentRealtimeAction;
  channel: string; // e.g. "space:abc-123" or "drop:xyz-789"
  spaceId?: string | null;
  dropId?: string | null;
  comment?: CommentWithReplies;
  commentId?: string;
  parentId?: string | null;
  deletedCount?: number;
  reactionsCount?: number;
  reactionType?: string;
  isSoftDeleted?: boolean;
  timestamp: string;
}

// Ensure single instance across HMR in development
const globalForRealtime = globalThis as unknown as {
  commentEventHub?: EventEmitter;
};

export const commentEventHub =
  globalForRealtime.commentEventHub || new EventEmitter();

// Support high number of concurrent listeners on channels
commentEventHub.setMaxListeners(500);

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.commentEventHub = commentEventHub;
}

export function getChannelName(params: {
  spaceId?: string | null;
  dropId?: string | null;
}): string {
  if (params.spaceId) return `space:${params.spaceId}`;
  if (params.dropId) return `drop:${params.dropId}`;
  throw new Error('Either spaceId or dropId must be provided to get channel name');
}

/**
 * Publish a comment realtime event to the specific channel.
 */
export function publishCommentEvent(event: CommentRealtimeEvent) {
  try {
    commentEventHub.emit(event.channel, event);
  } catch (err) {
    console.error('[Realtime] Failed to emit comment event:', err);
  }
}

/**
 * Subscribe to a specific channel's comment events.
 * Returns an unsubscribe callback.
 */
export function subscribeToCommentChannel(
  channel: string,
  listener: (event: CommentRealtimeEvent) => void
): () => void {
  commentEventHub.on(channel, listener);
  return () => {
    commentEventHub.off(channel, listener);
  };
}
