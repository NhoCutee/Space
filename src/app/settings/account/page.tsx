import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccountForm } from './AccountForm';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tài khoản — Cài đặt — Spaces',
  description: 'Quản lý thông tin tài khoản, email và bảo mật trên Spaces.',
};

export default async function AccountSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/account');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });

  if (!dbUser) {
    redirect('/login');
  }

  const createdAtFormatted = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dbUser.createdAt);

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Cài đặt tài khoản
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Quản lý thông tin đăng nhập, địa chỉ email và các quyền hạn tài khoản của bạn.
        </p>
      </div>

      <AccountForm
        initialData={{
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role,
          createdAtFormatted,
          hasPassword: Boolean(dbUser.passwordHash),
        }}
      />
    </div>
  );
}
