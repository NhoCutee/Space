import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    // When running on Vercel or other serverless platforms, enforce connection_limit=1
    // to avoid exhausting connection slots on limited DB plans (e.g., Aiven max 20).
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      url.searchParams.set('connection_limit', '1');
      if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '15');
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const datasourceUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;
