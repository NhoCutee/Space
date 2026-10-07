import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getConnectedAccountsAction } from '@/actions/settings';
import { ConnectionsView } from './ConnectionsView';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Liên kết tài khoản — Cài đặt — Spaces',
  description: 'Quản lý tài khoản đăng nhập Google, GitHub và các nhà cung cấp OAuth.',
};

export default async function ConnectionsSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/connections');
  }

  const { accounts, hasPassword } = await getConnectedAccountsAction();

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Liên kết tài khoản
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Quản lý các tài khoản bên ngoài dùng để xác thực và đăng nhập vào Spaces.
        </p>
      </div>

      <ConnectionsView initialAccounts={accounts} hasPassword={hasPassword} />
    </div>
  );
}
