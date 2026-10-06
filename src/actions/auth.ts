'use server';

import { prisma } from '@/lib/prisma';
import {
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  loginWithCredentials,
  registerWithCredentials,
  generatePKCE,
  generateOAuthState,
  getAuthorizationUrl,
  OAuthProvider,
  COOKIE_OAUTH_STATE,
  COOKIE_OAUTH_VERIFIER,
  getBaseCookieOptions,
} from '@/lib/auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Development-only persona switcher.
 * STRICTLY disabled in production mode.
 */
export async function switchPersona(username: string) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Unauthorized: Persona switching is strictly prohibited in production.');
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) throw new Error('User not found');

  await setCurrentUser(user.id);
  revalidatePath('/');
  return { success: true, user };
}

/**
 * Production login action with brute-force rate limiting.
 */
export async function loginAction(identifier: string, password: string) {
  const { checkRateLimit, RATE_LIMIT_PRESETS } = await import('@/lib/security/rateLimit');
  const rateLimitKey = `auth:login:${identifier.trim().toLowerCase()}`;
  const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_PRESETS.AUTH);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
    };
  }

  const result = await loginWithCredentials(identifier, password);
  if (result.success) {
    revalidatePath('/');
  }
  return result;
}

/**
 * Production registration action with rate limiting and password policy enforcement.
 */
export async function registerAction(params: {
  username: string;
  displayName: string;
  email: string;
  password: string;
  bio?: string;
}) {
  const { checkRateLimit, RATE_LIMIT_PRESETS } = await import('@/lib/security/rateLimit');
  const rateLimitKey = `auth:register:${params.email.trim().toLowerCase()}`;
  const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_PRESETS.AUTH);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many registration attempts. Please try again in ${retryAfter} seconds.`,
    };
  }

  const result = await registerWithCredentials(params);
  if (result.success) {
    revalidatePath('/');
  }
  return result;
}

/**
 * Production logout action: revokes server-side session and wipes secure cookies.
 */
export async function logoutAction() {
  await clearCurrentUser();
  revalidatePath('/');
  return { success: true };
}

/**
 * Generates OAuth2 authorization URL with PKCE and state cookies.
 */
export async function getOAuthUrlAction(provider: OAuthProvider) {
  const cookieStore = await cookies();
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateOAuthState(provider);

  const baseOptions = getBaseCookieOptions();
  // 10 minutes lifetime for oauth handshakes
  cookieStore.set(COOKIE_OAUTH_STATE, state, { ...baseOptions, maxAge: 600 });
  cookieStore.set(COOKIE_OAUTH_VERIFIER, codeVerifier, { ...baseOptions, maxAge: 600 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/callback/${provider}`;

  const authUrl = getAuthorizationUrl(provider, redirectUri, state, codeChallenge);
  return { success: true, authUrl };
}

export async function completeOnboarding(
  interests: string[],
  selectedSpaceIds?: string[]
): Promise<{ success: boolean; error?: string }> {
  const cookieUser = await getCurrentUser();
  if (!cookieUser) {
    return { success: false, error: 'Bạn cần đăng nhập để hoàn tất thiết lập.' };
  }

  if (interests.length < 3) {
    return { success: false, error: 'Vui lòng chọn ít nhất 3 chủ đề quan tâm.' };
  }

  try {
    await prisma.user.update({
      where: { id: cookieUser.id },
      data: {
        interests: JSON.stringify(interests),
      },
    });

    let spacesToJoin: string[] = selectedSpaceIds || [];

    // If no specific spaces selected, auto-match from interests
    if (spacesToJoin.length === 0) {
      const matchingSpaces = await prisma.space.findMany({
        where: {
          OR: interests.map((interest) => ({
            category: { contains: interest },
          })),
        },
        take: 4,
        select: { id: true },
      });
      spacesToJoin = matchingSpaces.map((s) => s.id);
    }

    for (const spaceId of spacesToJoin) {
      const existing = await prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId,
            userId: cookieUser.id,
          },
        },
      });

      if (!existing) {
        await prisma.$transaction([
          prisma.spaceMember.create({
            data: {
              spaceId,
              userId: cookieUser.id,
              role: 'MEMBER',
            },
          }),
          prisma.space.update({
            where: { id: spaceId },
            data: { membersCount: { increment: 1 } },
          }),
        ]);
      }
    }

    revalidatePath('/');
    revalidatePath('/explore');
    return { success: true };
  } catch (err) {
    console.error('Failed to complete onboarding:', err);
    return { success: false, error: 'Lỗi khi lưu thông tin onboarding.' };
  }
}
