import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from './ProfileForm';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân — Cài đặt — Spaces',
  description: 'Tùy chỉnh thông tin hồ sơ công khai của bạn trên Spaces.',
};

export default async function ProfileSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/profile');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!dbUser) {
    redirect('/login');
  }

  let parsedInterests: string[] = [];
  try {
    parsedInterests = JSON.parse(dbUser.interests || '[]');
  } catch {}

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Hồ sơ cá nhân
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Thông tin này sẽ xuất hiện trên trang cá nhân và tác phẩm sáng tác của bạn.
        </p>
      </div>

      <ProfileForm
        initialData={{
          displayName: dbUser.displayName,
          username: dbUser.username,
          bio: dbUser.bio || '',
          interests: parsedInterests,
          avatarUrl: dbUser.avatarUrl || '',
        }}
      />
    </div>
  );
}
