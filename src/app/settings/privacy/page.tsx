import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getPrivacySettingsAction } from '@/actions/settings';
import { PrivacyForm } from './PrivacyForm';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quyền riêng tư — Cài đặt — Spaces',
  description: 'Kiểm soát chế độ riêng tư và hiển thị dữ liệu của bạn trên Spaces.',
};

export default async function PrivacySettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/privacy');
  }

  const settings = await getPrivacySettingsAction();

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Quyền riêng tư
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Lựa chọn cách thức và phạm vi hiển thị hồ sơ cá nhân của bạn với cộng đồng Spaces.
        </p>
      </div>

      <PrivacyForm
        initialSettings={{
          isPrivateProfile: settings?.isPrivateProfile ?? false,
          showEmail: settings?.showEmail ?? false,
          activityPublic: settings?.activityPublic ?? true,
        }}
      />
    </div>
  );
}
