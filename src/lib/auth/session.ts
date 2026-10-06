import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { Session, User } from '@prisma/client';
import { signAccessToken } from './jwt';

const REFRESH_TOKEN_LIFETIME_DAYS = 30;

export interface SessionWithUser extends Session {
  user: User;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a new database-backed session with a hashed refresh token.
 */
export async function createSession(
  userId: string,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<{ session: Session; rawRefreshToken: string; accessToken: string }> {
  const rawRefreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      hashedRefreshToken,
      userAgent: metadata?.userAgent?.slice(0, 500) || null,
      ipAddress: metadata?.ipAddress?.slice(0, 45) || null,
      expiresAt,
    },
    include: {
      user: {
        select: { role: true },
      },
    },
  });

  const accessToken = await signAccessToken({
    sub: userId,
    sessionId: session.id,
    role: session.user.role,
  });

  return { session, rawRefreshToken, accessToken };
}

/**
 * Validates a session by ID and ensures it has not been revoked or expired.
 */
export async function getActiveSession(sessionId: string): Promise<SessionWithUser | null> {
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session;
}

/**
 * Rotates a refresh token:
 * Validates the old refresh token, revokes the old session,
 * creates a new session, and detects token reuse attacks.
 */
export async function rotateSession(
  rawRefreshToken: string,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<{ session: Session; rawRefreshToken: string; accessToken: string; user: User } | null> {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') return null;

  const hashedToken = hashToken(rawRefreshToken);

  const existingSession = await prisma.session.findUnique({
    where: { hashedRefreshToken: hashedToken },
    include: { user: true },
  });

  if (!existingSession) {
    return null;
  }

  // Token reuse detection: if a revoked session's token is presented again,
  // revoke ALL sessions for that user immediately to protect the compromised account.
  if (existingSession.revokedAt) {
    const { logSecurityEvent } = await import('@/lib/security/logger');
    logSecurityEvent({
      event: 'AUTH_SESSION_REUSE_DETECTED',
      userId: existingSession.userId,
      severity: 'ALERT',
      details: { sessionId: existingSession.id },
    });
    await revokeAllUserSessions(existingSession.userId);
    return null;
  }

  // Check expiration
  if (existingSession.expiresAt.getTime() <= Date.now()) {
    await prisma.session.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  // Atomically revoke current session and issue replacement session
  const now = new Date();
  const newRawRefreshToken = generateRefreshToken();
  const newHashedToken = hashToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  const [_, newSession] = await prisma.$transaction([
    prisma.session.update({
      where: { id: existingSession.id },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    }),
    prisma.session.create({
      data: {
        userId: existingSession.userId,
        hashedRefreshToken: newHashedToken,
        userAgent: metadata?.userAgent?.slice(0, 500) || existingSession.userAgent,
        ipAddress: metadata?.ipAddress?.slice(0, 45) || existingSession.ipAddress,
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  const newAccessToken = await signAccessToken({
    sub: existingSession.userId,
    sessionId: newSession.id,
    role: existingSession.user.role,
  });

  return {
    session: newSession,
    rawRefreshToken: newRawRefreshToken,
    accessToken: newAccessToken,
    user: existingSession.user,
  };
}

/**
 * Revokes an individual session.
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revokes all active sessions for a user (used upon password change or account compromise).
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  if (!userId) return 0;
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  return result.count;
}
