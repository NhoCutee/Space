'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { revokeSessionAction, revokeAllOtherSessionsAction } from '@/actions/settings';
import {
  Laptop,
  Smartphone,
  LogOut,
  Loader2,
  ShieldCheck,
  Clock,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

interface SessionItem {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

interface SessionsViewProps {
  initialSessions: SessionItem[];
}

function parseDevice(ua: string | null): { name: string; isMobile: boolean } {
  if (!ua) return { name: 'Trình duyệt không xác định', isMobile: false };

  const isMobile = /mobile|iphone|android|ipad/i.test(ua);

  let browser = 'Trình duyệt Web';
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = 'Google Chrome';
  else if (/edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';

  let os = 'Thiết bị';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';

  return { name: `${browser} trên ${os}`, isMobile };
}

export function SessionsView({ initialSessions }: SessionsViewProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAllOther, setIsRevokingAllOther] = useState(false);

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  const handleRevokeSingle = async (session: SessionItem) => {
    if (revokingId) return;
    setRevokingId(session.id);

    try {
      const res = await revokeSessionAction(session.id);
      if (!res.success) {
        toast.error(res.error || 'Không thể thu hồi phiên.');
        setRevokingId(null);
        return;
      }

      if (session.isCurrent) {
        toast.success('Đã đăng xuất phiên làm việc hiện tại.');
        window.location.href = '/';
        return;
      }

      toast.success('Đã thu hồi phiên đăng nhập thành công!');
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      router.refresh();
    } catch (err: unknown) {
      console.error('[SessionsView] Revoke error:', err);
      toast.error('Có lỗi xảy ra khi thu hồi phiên.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (isRevokingAllOther || otherSessionsCount === 0) return;
    setIsRevokingAllOther(true);

    try {
      const res = await revokeAllOtherSessionsAction();
      if (!res.success) {
        toast.error(res.error || 'Không thể thu hồi các phiên khác.');
        setIsRevokingAllOther(false);
        return;
      }

      toast.success('Đã thu hồi tất cả các phiên đăng nhập khác!', {
        description: 'Chỉ còn phiên làm việc trên thiết bị hiện tại được giữ lại.',
      });
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      router.refresh();
    } catch (err: unknown) {
      console.error('[SessionsView] Revoke all other error:', err);
      toast.error('Có lỗi xảy ra khi đăng xuất các thiết bị khác.');
    } finally {
      setIsRevokingAllOther(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card with action */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-foreground">
              {sessions.length} thiết bị đang hoạt động
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Danh sách các phiên đăng nhập đang hợp lệ trên cơ sở dữ liệu Spaces.
          </p>
        </div>

        {otherSessionsCount > 0 && (
          <button
            type="button"
            onClick={handleRevokeAllOther}
            disabled={isRevokingAllOther}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-destructive/10 text-destructive border border-border/60 hover:border-destructive/30 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            {isRevokingAllOther ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất tất cả thiết bị khác</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.map((s) => {
          const device = parseDevice(s.userAgent);
          const DeviceIcon = device.isMobile ? Smartphone : Laptop;
          const isThisRevoking = revokingId === s.id;

          const lastActiveFormatted = new Intl.DateTimeFormat('vi-VN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(s.lastUsedAt));

          return (
            <div
              key={s.id}
              className={`p-5 rounded-2xl glass border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                s.isCurrent
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border/70 hover:border-border'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    s.isCurrent
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  <DeviceIcon className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{device.name}</span>
                    {s.isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        Thiết bị này
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground/70" />
                      <span>Hoạt động: {lastActiveFormatted}</span>
                    </div>

                    {s.ipAddress && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground/70" />
                        <span className="font-mono text-[11px]">{s.ipAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleRevokeSingle(s)}
                  disabled={isThisRevoking}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                    s.isCurrent
                      ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                      : 'bg-secondary hover:bg-destructive/10 text-destructive border border-border/60 hover:border-destructive/30'
                  }`}
                >
                  {isThisRevoking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang thu hồi...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{s.isCurrent ? 'Đăng xuất phiên này' : 'Thu hồi phiên'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
