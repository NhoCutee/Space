'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectProviderAction } from '@/actions/settings';
import { OAuthProvider } from '@/lib/auth';
import {
  Link2,
  Unlink,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface AccountItem {
  provider: OAuthProvider;
  createdAt: Date;
}

interface ConnectionsViewProps {
  initialAccounts: AccountItem[];
  hasPassword: boolean;
}

export function ConnectionsView({ initialAccounts, hasPassword }: ConnectionsViewProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [disconnectingProvider, setDisconnectingProvider] = useState<OAuthProvider | null>(null);

  const googleConnected = accounts.find((a) => a.provider === 'google');
  const githubConnected = accounts.find((a) => a.provider === 'github');

  const handleDisconnect = async (provider: OAuthProvider) => {
    if (disconnectingProvider) return;

    // Safety guard on client: prevent lockout
    if (!hasPassword && accounts.length <= 1) {
      toast.error('Không thể hủy liên kết!', {
        description:
          'Đây là phương thức đăng nhập duy nhất vào tài khoản của bạn. Vui lòng thiết lập mật khẩu trong mục Bảo mật trước khi ngắt kết nối.',
      });
      return;
    }

    setDisconnectingProvider(provider);
    try {
      const res = await disconnectProviderAction(provider);
      if (!res.success) {
        toast.error(res.error || 'Không thể hủy liên kết.');
        setDisconnectingProvider(null);
        return;
      }

      toast.success(`Đã hủy liên kết tài khoản ${provider === 'google' ? 'Google' : 'GitHub'} thành công!`);
      setAccounts((prev) => prev.filter((a) => a.provider !== provider));
      router.refresh();
    } catch (err: unknown) {
      console.error('[ConnectionsView] Disconnect error:', err);
      toast.error('Có lỗi xảy ra khi hủy liên kết.');
    } finally {
      setDisconnectingProvider(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header explanation */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Nhà cung cấp danh tính liên kết</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Liên kết tài khoản Google hoặc GitHub giúp bạn đăng nhập một chạm nhanh chóng và an toàn vào Spaces.
        </p>
      </div>

      {/* Providers List */}
      <div className="space-y-3.5">
        {/* 1. Google */}
        <div className="p-5 rounded-2xl glass border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40">
              {/* Google SVG */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Google</span>
                {googleConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Đã liên kết
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                    Chưa liên kết
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {googleConnected
                  ? `Đã liên kết từ ${new Intl.DateTimeFormat('vi-VN').format(new Date(googleConnected.createdAt))}`
                  : 'Đăng nhập Spaces chỉ bằng 1 chạm với tài khoản Google'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {googleConnected ? (
              <button
                type="button"
                onClick={() => handleDisconnect('google')}
                disabled={disconnectingProvider === 'google'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-border/60 hover:border-destructive/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {disconnectingProvider === 'google' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang ngắt...</span>
                  </>
                ) : (
                  <>
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Hủy liên kết</span>
                  </>
                )}
              </button>
            ) : (
              <a
                href="/api/auth/google"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <span>Liên kết tài khoản</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* 2. GitHub */}
        <div className="p-5 rounded-2xl glass border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center shrink-0 border border-border/40 text-foreground">
              {/* GitHub SVG */}
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">GitHub</span>
                {githubConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Đã liên kết
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                    Chưa liên kết
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {githubConnected
                  ? `Đã liên kết từ ${new Intl.DateTimeFormat('vi-VN').format(new Date(githubConnected.createdAt))}`
                  : 'Đăng nhập Spaces với tài khoản nhà phát triển GitHub'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {githubConnected ? (
              <button
                type="button"
                onClick={() => handleDisconnect('github')}
                disabled={disconnectingProvider === 'github'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-border/60 hover:border-destructive/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {disconnectingProvider === 'github' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang ngắt...</span>
                  </>
                ) : (
                  <>
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Hủy liên kết</span>
                  </>
                )}
              </button>
            ) : (
              <a
                href="/api/auth/github"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <span>Liên kết tài khoản</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Lockout notice */}
      {!hasPassword && accounts.length <= 1 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Bảo vệ chống mất quyền truy cập tài khoản</div>
            <p className="leading-relaxed opacity-90">
              Bạn hiện chưa thiết lập mật khẩu và chỉ có một phương thức đăng nhập liên kết. Để bảo đảm bạn không bị khóa khỏi tài khoản, hệ thống sẽ ngăn việc hủy liên kết này cho đến khi bạn tạo mật khẩu mới trong mục Bảo mật.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
