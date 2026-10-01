'use server';

import { prisma } from '@/lib/prisma';
import { setCurrentUser, clearCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function switchPersona(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) throw new Error('User not found');

  await setCurrentUser(user.id);
  revalidatePath('/');
  return { success: true, user };
}

export async function registerUser(username: string, displayName: string, email: string, bio?: string) {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const user = await prisma.user.create({
    data: {
      username: cleanUsername,
      displayName,
      email,
      bio: bio || 'Visual explorer & Space contributor',
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanUsername}`,
      interests: JSON.stringify([]),
    },
  });

  await setCurrentUser(user.id);
  revalidatePath('/');
  return user;
}

export async function completeOnboarding(interests: string[]) {
  const cookieUser = await import('@/lib/auth').then((m) => m.getCurrentUser());
  if (!cookieUser) throw new Error('No user to onboard');

  await prisma.user.update({
    where: { id: cookieUser.id },
    data: {
      interests: JSON.stringify(interests),
    },
  });

  // Auto-join matching spaces
  const matchingSpaces = await prisma.space.findMany({
    where: {
      OR: interests.map((interest) => ({
        category: { contains: interest },
      })),
    },
    take: 4,
  });

  for (const s of matchingSpaces) {
    await prisma.spaceMember.upsert({
      where: {
        spaceId_userId: {
          spaceId: s.id,
          userId: cookieUser.id,
        },
      },
      update: {},
      create: {
        spaceId: s.id,
        userId: cookieUser.id,
        role: 'MEMBER',
      },
    });
  }

  revalidatePath('/');
  return { success: true };
}
