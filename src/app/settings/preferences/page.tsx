import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getPreferencesAction } from '@/actions/settings';
import { PreferencesForm } from './PreferencesForm';
import { SettingsMobileBack } from '@/components/settings/SettingsMobileBack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tùy chọn giao diện — Cài đặt — Spaces',
  description: 'Tùy chỉnh chủ đề sáng/tối và trải nghiệm thị giác trên Spaces.',
};

export default async function PreferencesSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login?redirect=/settings/preferences');
  }

  const prefs = await getPreferencesAction();

  return (
    <div className="space-y-6">
      <SettingsMobileBack />

      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Tùy chọn giao diện
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Cá nhân hóa giao diện người dùng và cài đặt hiển thị theo sở thích của bạn.
        </p>
      </div>

      <PreferencesForm
        initialSettings={{
          theme: (prefs?.theme as 'light' | 'dark' | 'system') || 'system',
          reducedMotion: prefs?.reducedMotion ?? false,
        }}
      />
    </div>
  );
}
