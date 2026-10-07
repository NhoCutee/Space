import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from './jwt';
import {
  createSession,
  getActiveSession,
  rotateSession,
  revokeSession,
  hashToken,
} from './session';
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  setAuthCookies,
  clearAuthCookies,
} from './cookies';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from './password';

export * from './password';
export * from './jwt';
export * from './session';
export * from './cookies';
export * from './oauth';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  interests: string[];
  role: string;
}

/**
 * Authoritative server-side identity resolution:
 * 1. Checks and verifies signed JWT access token.
 * 2. If access token is missing or expired, attempts secure refresh token rotation.
 * 3. Returns null if unauthenticated. Never falls back to a mock user.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside of HTTP context (e.g. background scripts)
    return null;
  }

  const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  // 1. Try JWT Access Token
  if (accessToken) {
    const claims = await verifyAccessToken(accessToken);
    if (claims) {
      const activeSession = await getActiveSession(claims.sessionId);
      if (activeSession && activeSession.userId === claims.sub) {
        return {
          id: activeSession.user.id,
          username: activeSession.user.username,
          displayName: activeSession.user.displayName,
          avatarUrl: activeSession.user.avatarUrl,
          bio: activeSession.user.bio,
          interests: JSON.parse(activeSession.user.interests || '[]'),
          role: activeSession.user.role,
        };
      }
    }
  }

  // 2. Try Refresh Token Rotation if Access Token is expired or missing
  if (refreshToken) {
    try {
      const rotated = await rotateSession(refreshToken);
      if (rotated) {
        setAuthCookies(cookieStore, rotated.accessToken, rotated.rawRefreshToken);
        return {
          id: rotated.user.id,
          username: rotated.user.username,
          displayName: rotated.user.displayName,
          avatarUrl: rotated.user.avatarUrl,
          bio: rotated.user.bio,
          interests: JSON.parse(rotated.user.interests || '[]'),
          role: rotated.user.role,
        };
      } else {
        clearAuthCookies(cookieStore);
      }
    } catch {
      // Rotation failed or expired session
      clearAuthCookies(cookieStore);
    }
  }

  // 3. Strictly unauthenticated
  return null;
}

/**
 * Creates a real database-backed authenticated session and sets secure cookies.
 */
export async function authenticateUserSession(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const { rawRefreshToken, accessToken } = await createSession(userId);

  try {
    const cookieStore = await cookies();
    setAuthCookies(cookieStore, accessToken, rawRefreshToken);
  } catch {
    // Outside of HTTP request scope (e.g. CLI scripts, unit tests)
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    interests: JSON.parse(user.interests || '[]'),
    role: user.role,
  };
}

/**
 * Backward compatibility wrapper: securely logs in the specified user ID
 * using server-side session and encrypted token cookies (never raw UUID).
 */
export async function setCurrentUser(userId: string): Promise<void> {
  await authenticateUserSession(userId);
}

/**
 * Clears authentication cookies and revokes the active session in the database.
 */
export async function clearCurrentUser(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);
      const session = await prisma.session.findUnique({
        where: { hashedRefreshToken: hashedToken },
      });
      if (session) {
        await revokeSession(session.id);
      }
    }

    clearAuthCookies(cookieStore);
  } catch (err) {
    console.error('[Auth] Error clearing user session:', err);
  }
}

/**
 * Production Email/Password login.
 */
export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  if (!identifier || !password) {
    return { success: false, error: 'Email/username and password are required' };
  }

  const cleanIdentifier = identifier.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanIdentifier },
        { username: cleanIdentifier },
      ],
    },
  });

  if (!user || !user.passwordHash) {
    // Avoid user enumeration
    return { success: false, error: 'Invalid credentials' };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  const authUser = await authenticateUserSession(user.id);
  return { success: true, user: authUser };
}

/**
 * Production Registration with Password.
 */
export async function registerWithCredentials(params: {
  username: string;
  displayName: string;
  email: string;
  password: string;
  bio?: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanUsername = params.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const cleanEmail = params.email.toLowerCase().trim();

  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return { success: false, error: 'Username must be between 3 and 30 characters' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  const policy = validatePasswordPolicy(params.password);
  if (!policy.valid) {
    return { success: false, error: policy.error };
  }

  // Check unique constraints
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: cleanUsername }, { email: cleanEmail }],
    },
  });

  if (existing) {
    if (existing.username === cleanUsername) {
      return { success: false, error: 'Username is already taken' };
    }
    return { success: false, error: 'Email is already registered' };
  }

  const passwordHash = await hashPassword(params.password);

  const newUser = await prisma.user.create({
    data: {
      username: cleanUsername,
      displayName: params.displayName.trim() || cleanUsername,
      email: cleanEmail,
      passwordHash,
      bio: params.bio?.trim() || 'Visual explorer & Space contributor',
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanUsername}`,
      interests: JSON.stringify([]),
      role: 'MEMBER',
    },
  });

  const authUser = await authenticateUserSession(newUser.id);
  return { success: true, user: authUser };
}
