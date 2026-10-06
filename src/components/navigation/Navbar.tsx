'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Search, Layers, Moon, Sun, Sparkles, Compass } from 'lucide-react';
import { PersonaSwitcher } from './PersonaSwitcher';
import { SearchDialog } from './SearchDialog';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface NavbarProps {
  user?: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  onOpenSearch?: () => void;
}

export function Navbar({ user, onOpenSearch }: NavbarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchClick = () => {
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      setIsSearchOpen(true);
    }
  };

  const navLinks = [
    { href: '/', label: 'Bảng tin', icon: Sparkles },
    { href: '/explore', label: 'Khám phá', icon: Compass },
    { href: '/collections', label: 'Bộ sưu tập', icon: Layers },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 w-full glass border-b border-border/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center text-background font-black tracking-tighter text-sm shadow-md group-hover:scale-105 transition-transform">
                S
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
                  SPACES
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                </span>
                <span className="text-xs text-muted-foreground/80 font-medium tracking-wide -mt-0.5 hidden sm:block">
                  Visual Commons
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: Search Trigger (Command Palette / Dialog) */}
          <div className="flex-1 max-w-md hidden sm:block">
            <button
              type="button"
              onClick={handleSearchClick}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-full border border-border/80 bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-all shadow-inner group cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="truncate">Tìm Không gian, chủ đề, thẩm mỹ...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md bg-background border border-border text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Actions & User */}
          <div className="flex items-center gap-2.5">
            {/* Quick Search on Mobile */}
            <button
              type="button"
              onClick={handleSearchClick}
              className="sm:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none active:scale-95 transition-all"
              aria-label="Tìm kiếm"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none active:scale-95"
                aria-label="Chuyển chế độ sáng/tối"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600" />
                )}
              </button>
            )}

            {/* Unified Creation CTA Button (Desktop/Tablet; Mobile uses BottomNav center action) */}
            <Link
              href="/create"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tạo mới</span>
            </Link>

            {/* Persona Switcher for pair-testing */}
            {user && (
              <PersonaSwitcher
                currentUsername={user.username}
                currentDisplayName={user.displayName}
                currentAvatar={user.avatarUrl}
              />
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog Modal */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
