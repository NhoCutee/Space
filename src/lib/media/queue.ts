import amqp, { Channel, ChannelModel } from 'amqplib';
import {
  RABBITMQ_QUEUE_NAME,
  RABBITMQ_EXCHANGE_NAME,
  RABBITMQ_ROUTING_KEY,
  RABBITMQ_DLX_EXCHANGE,
  RABBITMQ_DLQ_NAME,
} from './constants';
import { MediaJobPayload } from './types';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let isRabbitAvailable = false;
let hasCheckedRabbit = false;

// In-memory fallback queue for local development when RabbitMQ broker is offline
type JobHandler = (job: MediaJobPayload) => Promise<void>;
const inMemoryQueue: MediaJobPayload[] = [];
let localWorkerHandler: JobHandler | null = null;

export async function getRabbitChannel(): Promise<Channel | null> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  try {
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // 1. Setup Dead Letter Exchange & Queue
    await channel.assertExchange(RABBITMQ_DLX_EXCHANGE, 'direct', { durable: true });
    await channel.assertQueue(RABBITMQ_DLQ_NAME, { durable: true });
    await channel.bindQueue(RABBITMQ_DLQ_NAME, RABBITMQ_DLX_EXCHANGE, 'dead-letter');

    // 2. Setup Main Topic Exchange & Durable Processing Queue with DLX configuration
    await channel.assertExchange(RABBITMQ_EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue(RABBITMQ_QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': RABBITMQ_DLX_EXCHANGE,
        'x-dead-letter-routing-key': 'dead-letter',
      },
    });
    await channel.bindQueue(RABBITMQ_QUEUE_NAME, RABBITMQ_EXCHANGE_NAME, 'media.image.*');

    isRabbitAvailable = true;
    hasCheckedRabbit = true;
    console.log('[RabbitMQ] Connected and topology asserted successfully.');
    return channel;
  } catch {
    if (!hasCheckedRabbit) {
      console.warn('[RabbitMQ] Broker not reachable at', url, '— using in-memory queue fallback for local dev.');
      hasCheckedRabbit = true;
    }
    isRabbitAvailable = false;
    channel = null;
    connection = null;
    return null;
  }
}

/**
 * Publish a lightweight media processing job to RabbitMQ.
 * Do NOT send binary data through RabbitMQ — only metadata and sourcePath.
 */
export async function publishMediaJob(job: MediaJobPayload): Promise<boolean> {
  const ch = await getRabbitChannel();

  if (ch && isRabbitAvailable) {
    const payloadBuffer = Buffer.from(JSON.stringify(job));
    return ch.publish(RABBITMQ_EXCHANGE_NAME, RABBITMQ_ROUTING_KEY, payloadBuffer, {
      persistent: true,
      contentType: 'application/json',
      messageId: job.jobId,
      headers: {
        'x-retry-count': job.retryCount,
      },
    });
  }

  // Fallback to in-memory dispatch if RabbitMQ is not connected
  if (localWorkerHandler) {
    // Process asynchronously in background
    setTimeout(async () => {
      try {
        await localWorkerHandler!(job);
      } catch (err) {
        console.error('[InMemoryQueue] Job processing failed:', err);
      }
    }, 50);
  } else {
    inMemoryQueue.push(job);
  }

  return true;
}

/**
 * Register a fallback worker handler for in-memory queue mode
 */
export function registerLocalWorkerHandler(handler: JobHandler): void {
  localWorkerHandler = handler;
  // Drain any queued items
  while (inMemoryQueue.length > 0) {
    const job = inMemoryQueue.shift();
    if (job) {
      setTimeout(() => handler(job), 50);
    }
  }
}

export function isRabbitConnected(): boolean {
  return isRabbitAvailable;
}
