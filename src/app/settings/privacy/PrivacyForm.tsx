'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePrivacySettingsAction } from '@/actions/settings';
import { Eye, Mail, Activity, Loader2, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface PrivacyFormProps {
  initialSettings: {
    isPrivateProfile: boolean;
    showEmail: boolean;
    activityPublic: boolean;
  };
}

export function PrivacyForm({ initialSettings }: PrivacyFormProps) {
  const router = useRouter();
  const [isPrivateProfile, setIsPrivateProfile] = useState(initialSettings.isPrivateProfile);
  const [showEmail, setShowEmail] = useState(initialSettings.showEmail);
  const [activityPublic, setActivityPublic] = useState(initialSettings.activityPublic);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const res = await updatePrivacySettingsAction({
        isPrivateProfile,
        showEmail,
        activityPublic,
      });

      if (!res.success) {
        toast.error(res.error || 'Cập nhật thất bại.');
        return;
      }

      toast.success('Đã lưu tùy chọn quyền riêng tư thành công!');
      router.refresh();
    } catch (err: unknown) {
      console.error('[PrivacyForm] Error:', err);
      toast.error('Có lỗi xảy ra khi lưu thiết lập.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Kiểm soát hiển thị hồ sơ</h3>
        </div>

        {/* Toggle 1: isPrivateProfile */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0 mt-0.5">
              <Eye className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label
                htmlFor="isPrivateProfile"
                className="text-xs font-bold text-foreground cursor-pointer"
              >
                Chế độ hồ sơ riêng tư
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Khi bật, chỉ những người theo dõi được chấp thuận mới xem được toàn bộ các tác phẩm và bộ sưu tập của bạn.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="isPrivateProfile"
              type="checkbox"
              checked={isPrivateProfile}
              onChange={(e) => setIsPrivateProfile(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border/80"></div>
          </label>
        </div>

        {/* Toggle 2: showEmail */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0 mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label htmlFor="showEmail" className="text-xs font-bold text-foreground cursor-pointer">
                Hiển thị địa chỉ email công khai
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cho phép người xem và các Curator nhìn thấy địa chỉ email liên hệ trên trang hồ sơ cá nhân.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="showEmail"
              type="checkbox"
              checked={showEmail}
              onChange={(e) => setShowEmail(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border/80"></div>
          </label>
        </div>

        {/* Toggle 3: activityPublic */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label
                htmlFor="activityPublic"
                className="text-xs font-bold text-foreground cursor-pointer"
              >
                Hiển thị hoạt động công khai
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cho phép cộng đồng xem các tác phẩm bạn đã tương tác hoặc thả tim trên luồng hoạt động.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="activityPublic"
              type="checkbox"
              checked={activityPublic}
              onChange={(e) => setActivityPublic(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border/80"></div>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Lưu tùy chọn quyền riêng tư</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
