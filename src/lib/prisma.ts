import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sanitizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let clean = raw.trim();

  // Strip accidental surrounding double or single quotes (common Vercel UI copy-paste mistake)
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }

  // Strip accidental 'DATABASE_URL=' prefix
  if (clean.startsWith('DATABASE_URL=')) {
    clean = clean.slice('DATABASE_URL='.length).trim();
  }

  // Strip surrounding quotes again if it was DATABASE_URL="..."
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }

  return clean;
}

function getDatabaseUrl(): string | undefined {
  const sanitized = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (!sanitized) return undefined;

  // Sync back to process.env.DATABASE_URL so Prisma Query Engine (WASM/Rust) also reads the sanitized value
  process.env.DATABASE_URL = sanitized;

  try {
    const url = new URL(sanitized);
    // When running on Vercel or other serverless platforms, enforce connection_limit=1
    // to avoid exhausting connection slots on limited DB plans.
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      url.searchParams.set('connection_limit', '1');
      if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '15');
      }
    }
    return url.toString();
  } catch {
    return sanitized;
  }
}

const datasourceUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl,
            },
          },
        }
      : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;
