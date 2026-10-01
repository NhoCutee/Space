import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  interests: string[];
}

const SESSION_COOKIE_NAME = 'spaces_user_id';

export async function getCurrentUser(): Promise<AuthUser | null> {
  let userId: string | undefined;

  try {
    const cookieStore = await cookies();
    userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    // Expected when called outside of Next.js HTTP request scope (e.g. scripts or static build)
    userId = undefined;
  }

  try {
    if (!userId) {
      // Default to Maya persona for first-time instant preview if no session cookie
      const defaultUser = await prisma.user.findFirst({
        where: { username: 'maya_curates' },
      });
      if (defaultUser) {
        return {
          id: defaultUser.id,
          username: defaultUser.username,
          displayName: defaultUser.displayName,
          avatarUrl: defaultUser.avatarUrl,
          bio: defaultUser.bio,
          interests: JSON.parse(defaultUser.interests || '[]'),
        };
      }
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      interests: JSON.parse(user.interests || '[]'),
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export async function setCurrentUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: 'lax',
  });
}

export async function clearCurrentUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
