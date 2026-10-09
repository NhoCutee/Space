'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Compass, Plus, Layers, User } from 'lucide-react';

interface BottomNavProps {
  currentUsername?: string;
}

export function BottomNav({ currentUsername }: BottomNavProps) {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const links = [
    { href: '/', label: 'Bảng tin', icon: Sparkles },
    { href: '/explore', label: 'Khám phá', icon: Compass },
    { href: '/create', label: 'Tạo mới', icon: Plus, isAction: true },
    { href: '/collections', label: 'Bộ sưu tập', icon: Layers },
    { href: currentUsername ? `/u/${currentUsername}` : '/onboarding', label: 'Cá nhân', icon: User },
  ];

  return (
    <nav
      aria-label="Điều hướng chính trên di động"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/80 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          if (link.isAction) {
            return (
              <Link
                key={link.label}
                href="/create"
                className="w-11 h-11 -mt-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer ring-4 ring-background"
                aria-label="Tạo mới tác phẩm hoặc không gian"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 text-[11px] font-medium transition-all select-none active:scale-95 ${
                isActive
                  ? 'text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="leading-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
