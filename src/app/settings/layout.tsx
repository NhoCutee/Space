import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { SettingsNav } from '@/components/settings/SettingsNav';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cài đặt tài khoản — Spaces',
  description: 'Quản lý thông tin hồ sơ, bảo mật và tùy chọn tài khoản Spaces.',
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirect=/settings');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Desktop Sidebar Navigation */}
        <SettingsNav
          user={{
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
            role: currentUser.role,
          }}
        />

        {/* Dynamic Settings Content */}
        <main className="flex-1 min-w-0 w-full">{children}</main>
      </div>
    </div>
  );
}
