export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface WindowRecord {
  timestamps: number[];
}

// In-memory sliding window store with automatic expiration cleanup
const memoryStore = new Map<string, WindowRecord>();

// Periodic garbage collection every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    // Retain only timestamps from the last 15 minutes
    const filtered = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
    if (filtered.length === 0) {
      memoryStore.delete(key);
    } else {
      record.timestamps = filtered;
    }
  }
}, 5 * 60 * 1000).unref();

export const RATE_LIMIT_PRESETS = {
  // Auth attempts (Brute-force defense for login & registration)
  AUTH: {
    maxRequests: process.env.NODE_ENV === 'production' ? 15 : 50,
    windowSeconds: 15 * 60,
  },
  // Upload: 10 uploads per minute per user/IP
  UPLOAD: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  // Content Mutations: 25 actions per minute (comments, drops, reactions)
  MUTATION: {
    maxRequests: 25,
    windowSeconds: 60,
  },
  // Public Searches / Queries: 60 per minute
  QUERY: {
    maxRequests: 60,
    windowSeconds: 60,
  },
} as const;

/**
 * Evaluates rate limit for a given key using an in-memory sliding window.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (record.timestamps.length >= config.maxRequests) {
    const oldest = record.timestamps[0] || now;
    const resetAt = oldest + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Record this hit
  record.timestamps.push(now);
  const remaining = config.maxRequests - record.timestamps.length;
  const resetAt = now + windowMs;

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

/**
 * Enforces rate limit and throws an error if exceeded.
 */
export async function enforceRateLimit(
  key: string,
  config: RateLimitConfig,
  errorMessage = 'Too many requests. Please try again later.'
): Promise<void> {
  const result = await checkRateLimit(key, config);
  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new Error(`${errorMessage} (Retry after ${retryAfterSec}s)`);
  }
}
