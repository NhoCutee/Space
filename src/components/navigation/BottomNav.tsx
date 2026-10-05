'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Compass, Plus, Layers, User } from 'lucide-react';

interface BottomNavProps {
  currentUsername?: string;
}

export function BottomNav({ currentUsername }: BottomNavProps) {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Feed', icon: Sparkles },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/create', label: 'Create', icon: Plus, isAction: true },
    { href: '/collections', label: 'Curated', icon: Layers },
    { href: currentUsername ? `/u/${currentUsername}` : '/onboarding', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/80 px-4 py-2">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          if (link.isAction) {
            return (
              <Link
                key={link.label}
                href="/create"
                className="w-10 h-10 -mt-4 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
                aria-label="Tạo mới"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-medium transition-colors ${
                isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
