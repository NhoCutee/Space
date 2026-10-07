'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { updatePreferencesAction } from '@/actions/settings';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Activity,
  Loader2,
  Sparkles,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface PreferencesFormProps {
  initialSettings: {
    theme: 'light' | 'dark' | 'system';
    reducedMotion: boolean;
  };
}

export function PreferencesForm({ initialSettings }: PreferencesFormProps) {
  const router = useRouter();
  const { theme: currentClientTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(
    initialSettings.theme
  );
  const [reducedMotion, setReducedMotion] = useState(initialSettings.reducedMotion);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (currentClientTheme === 'light' || currentClientTheme === 'dark' || currentClientTheme === 'system') {
      setSelectedTheme(currentClientTheme);
    }
  }, [currentClientTheme]);

  const handleSelectTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const res = await updatePreferencesAction({
        theme: selectedTheme,
        reducedMotion,
      });

      if (!res.success) {
        toast.error(res.error || 'Cập nhật giao diện thất bại.');
        return;
      }

      toast.success('Đã lưu tùy chọn giao diện thành công!');
      router.refresh();
    } catch (err: unknown) {
      console.error('[PreferencesForm] Error:', err);
      toast.error('Có lỗi xảy ra khi lưu tùy chọn.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Theme Selection */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Chủ đề hiển thị</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Chọn phong cách thị giác phù hợp nhất với không gian sáng tạo của bạn.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 relative ${
              mounted && selectedTheme === 'light'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                : 'border-border/70 hover:border-border bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              {mounted && selectedTheme === 'light' && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-foreground">Giao diện Sáng</div>
              <div className="text-[11px] text-muted-foreground">Tươi sáng, rõ nét</div>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 relative ${
              mounted && selectedTheme === 'dark'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                : 'border-border/70 hover:border-border bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              {mounted && selectedTheme === 'dark' && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-foreground">Giao diện Tối</div>
              <div className="text-[11px] text-muted-foreground">Tập trung, êm dịu mắt</div>
            </div>
          </button>

          {/* System Theme */}
          <button
            type="button"
            onClick={() => handleSelectTheme('system')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 relative ${
              mounted && selectedTheme === 'system'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                : 'border-border/70 hover:border-border bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center">
                <Monitor className="w-4 h-4" />
              </div>
              {mounted && selectedTheme === 'system' && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-foreground">Theo hệ thống</div>
              <div className="text-[11px] text-muted-foreground">Tự động đồng bộ OS</div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Reduced Motion */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label htmlFor="reducedMotion" className="text-xs font-bold text-foreground cursor-pointer">
                Giảm chuyển động (Reduced Motion)
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hạn chế các hiệu ứng chuyển động và hoạt họa phức tạp nhằm mang lại trải nghiệm tối giản và thân thiện hơn với thiết bị.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="reducedMotion"
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
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
              <span>Lưu tùy chọn giao diện</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
