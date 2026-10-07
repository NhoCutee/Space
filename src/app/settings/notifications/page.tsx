import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getNotificationSettingsAction } from '@/actions/settings';
import { NotificationsForm } from './NotificationsForm';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thông báo — Cài đặt — Spaces',
  description: 'Quản lý thông báo và các cập nhật tương tác của bạn trên Spaces.',
};

export default async function NotificationsSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/notifications');
  }

  const settings = await getNotificationSettingsAction();

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Thông báo
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Chọn loại thông báo bạn muốn nhận về các tương tác trên tác phẩm của mình.
        </p>
      </div>

      <NotificationsForm
        initialSettings={{
          notifyComments: settings?.notifyComments ?? true,
          notifyReplies: settings?.notifyReplies ?? true,
          notifyReactions: settings?.notifyReactions ?? true,
          notifyCuratorPick: settings?.notifyCuratorPick ?? true,
        }}
      />
    </div>
  );
}
