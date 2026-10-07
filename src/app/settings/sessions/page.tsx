import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getActiveSessionsAction } from '@/actions/settings';
import { SessionsView } from './SessionsView';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Phiên hoạt động — Cài đặt — Spaces',
  description: 'Quản lý các thiết bị và phiên đăng nhập đang hoạt động.',
};

export default async function SessionsSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/sessions');
  }

  const sessions = await getActiveSessionsAction();

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Phiên hoạt động
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Kiểm soát các trình duyệt và thiết bị đang đăng nhập vào tài khoản của bạn.
        </p>
      </div>

      <SessionsView initialSessions={sessions} />
    </div>
  );
}
