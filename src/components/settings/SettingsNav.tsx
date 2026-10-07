'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { logoutAction } from '@/actions/auth';
import {
  User,
  ShieldCheck,
  KeyRound,
  Laptop,
  Link2,
  Eye,
  Bell,
  Palette,
  LogOut,
  Loader2,
  ArrowLeft,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';

export const SETTINGS_NAV_ITEMS = [
  {
    href: '/settings/profile',
    label: 'Hồ sơ cá nhân',
    description: 'Tên hiển thị, tiểu sử, ảnh đại diện',
    icon: User,
  },
  {
    href: '/settings/account',
    label: 'Tài khoản',
    description: 'Email, thông tin tài khoản, xóa tài khoản',
    icon: ShieldCheck,
  },
  {
    href: '/settings/security',
    label: 'Mật khẩu & Bảo mật',
    description: 'Đổi mật khẩu, quy tắc an toàn',
    icon: KeyRound,
  },
  {
    href: '/settings/sessions',
    label: 'Phiên hoạt động',
    description: 'Quản lý thiết bị và đăng xuất từ xa',
    icon: Laptop,
  },
  {
    href: '/settings/connections',
    label: 'Liên kết tài khoản',
    description: 'Google, GitHub và nhà cung cấp OAuth',
    icon: Link2,
  },
  {
    href: '/settings/privacy',
    label: 'Quyền riêng tư',
    description: 'Chế độ riêng tư, hiển thị thông tin',
    icon: Eye,
  },
  {
    href: '/settings/notifications',
    label: 'Thông báo',
    description: 'Tương tác, bình luận và tuyển chọn',
    icon: Bell,
  },
  {
    href: '/settings/preferences',
    label: 'Tùy chọn giao diện',
    description: 'Chủ đề sáng/tối, giảm chuyển động',
    icon: Palette,
  },
] as const;

interface SettingsNavProps {
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role?: string;
  };
}

export function SettingsNav({ user }: SettingsNavProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(user.username)}`;
  const avatarSrc = user.avatarUrl || defaultAvatar;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logoutAction();
      toast.success('Đã đăng xuất thành công', {
        description: 'Hẹn gặp lại bạn trên Spaces!',
      });
      window.location.href = '/';
    } catch (err: unknown) {
      console.error('[SettingsNav] Logout error:', err);
      toast.error('Không thể hoàn tất đăng xuất.');
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col gap-5">
      {/* Back to Home Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group px-1"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>Quay lại trang chủ</span>
      </Link>

      {/* User Mini Card */}
      <div className="p-3.5 rounded-2xl glass border border-border/80 shadow-xs flex items-center gap-3">
        <img
          src={avatarSrc}
          alt={user.displayName}
          className="w-10 h-10 rounded-full object-cover ring-1 ring-border shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-foreground truncate">{user.displayName}</div>
          <div className="text-[11px] text-muted-foreground truncate">@{user.username}</div>
          {user.role && (
            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
              {user.role}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Group */}
      <div className="p-2 rounded-2xl glass border border-border/80 shadow-xs space-y-1">
        {/* Overview link */}
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            pathname === '/settings'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Tổng quan cài đặt</span>
        </Link>

        <div className="my-1.5 border-t border-border/40" />

        {/* 8 Categories */}
        {SETTINGS_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Logout */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
      >
        {isLoggingOut ? (
          <Loader2 className="w-4 h-4 animate-spin text-destructive shrink-0" />
        ) : (
          <LogOut className="w-4 h-4 text-destructive shrink-0" />
        )}
        <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}</span>
      </button>
    </aside>
  );
}
