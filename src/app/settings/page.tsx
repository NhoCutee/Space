import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  User,
  ShieldCheck,
  KeyRound,
  Laptop,
  Link2,
  Eye,
  Bell,
  Palette,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cài đặt tài khoản — Spaces',
  description: 'Trung tâm quản lý tài khoản, hồ sơ cá nhân và bảo mật trên Spaces.',
};

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirect=/settings');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      accounts: {
        select: { provider: true },
      },
      sessions: {
        where: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      },
      settings: true,
    },
  });

  if (!dbUser) {
    redirect('/login');
  }

  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(dbUser.username)}`;
  const avatarSrc = dbUser.avatarUrl || defaultAvatar;

  const categories = [
    {
      href: '/settings/profile',
      title: 'Hồ sơ cá nhân',
      description: 'Cập nhật tên hiển thị, ảnh đại diện, tiểu sử và chủ đề nghệ thuật quan tâm.',
      icon: User,
      badge: `@${dbUser.username}`,
    },
    {
      href: '/settings/account',
      title: 'Tài khoản',
      description: 'Quản lý địa chỉ email, trạng thái tài khoản và vùng xóa tài khoản.',
      icon: ShieldCheck,
      badge: dbUser.email,
    },
    {
      href: '/settings/security',
      title: 'Mật khẩu & Bảo mật',
      description: 'Đổi mật khẩu, quy tắc độ mạnh mật khẩu và chính sách thu hồi phiên.',
      icon: KeyRound,
      badge: dbUser.passwordHash ? 'Đã đặt mật khẩu' : 'Chưa có mật khẩu',
    },
    {
      href: '/settings/sessions',
      title: 'Phiên hoạt động',
      description: 'Xem các thiết bị đang đăng nhập, địa chỉ IP và đăng xuất từ xa.',
      icon: Laptop,
      badge: `${dbUser.sessions.length} thiết bị`,
    },
    {
      href: '/settings/connections',
      title: 'Liên kết tài khoản',
      description: 'Quản lý đăng nhập với Google, GitHub và các nhà cung cấp liên kết.',
      icon: Link2,
      badge: `${dbUser.accounts.length} liên kết`,
    },
    {
      href: '/settings/privacy',
      title: 'Quyền riêng tư',
      description: 'Kiểm soát chế độ hồ sơ riêng tư, hiển thị email và hoạt động công khai.',
      icon: Eye,
      badge: dbUser.settings?.isPrivateProfile ? 'Riêng tư' : 'Công khai',
    },
    {
      href: '/settings/notifications',
      title: 'Thông báo',
      description: 'Tùy chỉnh thông báo về bình luận, phản hồi, tương tác và Curator Picks.',
      icon: Bell,
      badge: 'Email & In-app',
    },
    {
      href: '/settings/preferences',
      title: 'Tùy chọn giao diện',
      description: 'Tùy biến chủ đề Sáng / Tối / Tự động và tối ưu hóa hiệu ứng chuyển động.',
      icon: Palette,
      badge: dbUser.settings?.theme === 'dark' ? 'Tối' : dbUser.settings?.theme === 'light' ? 'Sáng' : 'Tự động',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Cài đặt tài khoản
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Chọn một danh mục bên dưới để tùy chỉnh trải nghiệm và bảo mật tài khoản của bạn.
        </p>
      </div>

      {/* Account Snapshot Card */}
      <div className="p-5 sm:p-6 rounded-3xl glass border border-border/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={avatarSrc}
            alt={dbUser.displayName}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-border shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-base sm:text-lg">
                {dbUser.displayName}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                <Shield className="w-2.5 h-2.5" />
                {dbUser.role}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              @{dbUser.username} · {dbUser.email}
            </div>
          </div>
        </div>

        <Link
          href={`/u/${dbUser.username}`}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-all border border-border/60 self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Xem trang cá nhân</span>
        </Link>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.href}
              href={cat.href}
              className="group p-4 sm:p-5 rounded-2xl glass border border-border/70 hover:border-foreground/30 hover:shadow-md transition-all duration-150 flex items-start gap-4 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/80 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center text-foreground transition-colors shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {cat.title}
                  </h2>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
                <div className="mt-2.5">
                  <span className="inline-block text-[11px] font-medium text-muted-foreground/90 px-2 py-0.5 rounded-md bg-secondary/50 border border-border/40">
                    {cat.badge}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
