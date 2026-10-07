'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateNotificationSettingsAction } from '@/actions/settings';
import {
  Bell,
  MessageSquare,
  Reply,
  Heart,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationsFormProps {
  initialSettings: {
    notifyComments: boolean;
    notifyReplies: boolean;
    notifyReactions: boolean;
    notifyCuratorPick: boolean;
  };
}

export function NotificationsForm({ initialSettings }: NotificationsFormProps) {
  const router = useRouter();
  const [notifyComments, setNotifyComments] = useState(initialSettings.notifyComments);
  const [notifyReplies, setNotifyReplies] = useState(initialSettings.notifyReplies);
  const [notifyReactions, setNotifyReactions] = useState(initialSettings.notifyReactions);
  const [notifyCuratorPick, setNotifyCuratorPick] = useState(initialSettings.notifyCuratorPick);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const res = await updateNotificationSettingsAction({
        notifyComments,
        notifyReplies,
        notifyReactions,
        notifyCuratorPick,
      });

      if (!res.success) {
        toast.error(res.error || 'Cập nhật thất bại.');
        return;
      }

      toast.success('Đã lưu tùy chọn thông báo thành công!');
      router.refresh();
    } catch (err: unknown) {
      console.error('[NotificationsForm] Error:', err);
      toast.error('Có lỗi xảy ra khi lưu tùy chọn thông báo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Kênh nhận thông báo</h3>
        </div>

        {/* 1. notifyComments */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label htmlFor="notifyComments" className="text-xs font-bold text-foreground cursor-pointer">
                Bình luận trên tác phẩm
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nhận thông báo khi có người để lại cảm nghĩ hoặc nhận xét về tác phẩm của bạn.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="notifyComments"
              type="checkbox"
              checked={notifyComments}
              onChange={(e) => setNotifyComments(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border/80"></div>
          </label>
        </div>

        {/* 2. notifyReplies */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0 mt-0.5">
              <Reply className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label htmlFor="notifyReplies" className="text-xs font-bold text-foreground cursor-pointer">
                Phản hồi bình luận
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nhận thông báo khi có ai đó phản hồi trực tiếp một bình luận mà bạn đã đăng.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="notifyReplies"
              type="checkbox"
              checked={notifyReplies}
              onChange={(e) => setNotifyReplies(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border/80"></div>
          </label>
        </div>

        {/* 3. notifyReactions */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
              <Heart className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label htmlFor="notifyReactions" className="text-xs font-bold text-foreground cursor-pointer">
                Lượt tương tác & Thả tim
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Thông báo khi người dùng khác bày tỏ cảm xúc với tác phẩm sáng tạo của bạn.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="notifyReactions"
              type="checkbox"
              checked={notifyReactions}
              onChange={(e) => setNotifyReactions(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border/80"></div>
          </label>
        </div>

        {/* 4. notifyCuratorPick */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <label htmlFor="notifyCuratorPick" className="text-xs font-bold text-foreground cursor-pointer">
                Vinh danh Curator Pick
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nhận thông báo đặc biệt khi tác phẩm của bạn được đội ngũ Curator lựa chọn vào danh sách tác phẩm tiêu biểu.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              id="notifyCuratorPick"
              type="checkbox"
              checked={notifyCuratorPick}
              onChange={(e) => setNotifyCuratorPick(e.target.checked)}
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
              <Bell className="w-4 h-4" />
              <span>Lưu tùy chọn thông báo</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
