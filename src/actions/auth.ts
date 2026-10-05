'use server';

import { prisma } from '@/lib/prisma';
import { setCurrentUser } from '@/lib/auth';
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

export async function completeOnboarding(
  interests: string[],
  selectedSpaceIds?: string[]
): Promise<{ success: boolean; error?: string }> {
  const cookieUser = await import('@/lib/auth').then((m) => m.getCurrentUser());
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

