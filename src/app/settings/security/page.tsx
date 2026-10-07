import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SecurityForm } from './SecurityForm';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mật khẩu & Bảo mật — Cài đặt — Spaces',
  description: 'Quản lý mật khẩu và bảo mật tài khoản Spaces.',
};

export default async function SecuritySettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/security');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { passwordHash: true },
  });

  if (!dbUser) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Mật khẩu & Bảo mật
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Bảo vệ tài khoản của bạn với mật khẩu mạnh và xem xét các quy tắc bảo mật.
        </p>
      </div>

      <SecurityForm hasPassword={Boolean(dbUser.passwordHash)} />
    </div>
  );
}
