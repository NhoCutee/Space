'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/actions/auth';
import { User, Settings, LogOut, ChevronDown, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserMenuProps {
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logoutAction();
      toast.success('Đã đăng xuất thành công', {
        description: 'Hẹn gặp lại bạn trên Spaces!',
      });
      setIsOpen(false);
      // Hard navigation to root to wipe all client router cache & ensure fresh unauthenticated render
      window.location.href = '/';
    } catch (err: unknown) {
      console.error('[UserMenu] Logout failed:', err);
      toast.error('Không thể đăng xuất lúc này. Vui lòng thử lại.');
      setIsLoggingOut(false);
    }
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(user.username)}`;
  const avatarSrc = user.avatarUrl || defaultAvatar;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Menu tài khoản của ${user.displayName}`}
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-full text-xs font-medium border border-border/80 bg-background/80 hover:bg-secondary hover:text-foreground transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 shadow-2xs"
      >
        <img
          src={avatarSrc}
          alt={user.displayName}
          className="w-6 h-6 rounded-full object-cover ring-1 ring-border shrink-0"
        />
        <span className="font-semibold text-foreground truncate max-w-[110px] hidden sm:inline">
          {user.displayName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 hidden sm:inline ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Account Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-label="Menu tài khoản"
          className="absolute right-0 mt-2 w-64 p-2 rounded-2xl glass shadow-2xl border border-border/80 z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground"
        >
          {/* User Profile Header */}
          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 mb-1.5">
            <div className="flex items-center gap-3">
              <img
                src={avatarSrc}
                alt={user.displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate">
                  {user.displayName}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  @{user.username}
                </div>
                {user.role && (
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{user.role}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5">
            {/* 1. Tài khoản */}
            <Link
              href={`/u/${user.username}`}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-background transition-colors">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-xs">Tài khoản</span>
                <span className="text-[10px] text-muted-foreground">Xem hồ sơ & tác phẩm</span>
              </div>
            </Link>

            {/* 2. Cài đặt tài khoản */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-background transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-xs">Cài đặt tài khoản</span>
                <span className="text-[10px] text-muted-foreground">Tùy chọn & bảo mật</span>
              </div>
            </Link>
          </div>

          {/* Divider */}
          <div className="my-1.5 border-t border-border/60" />

          {/* 3. Đăng xuất */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            role="menuitem"
            className="flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none group"
          >
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive group-hover:bg-destructive/20 transition-colors">
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-destructive text-xs">
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </span>
              <span className="text-[10px] text-destructive/70">
                Thu hồi phiên & xóa cookie
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
