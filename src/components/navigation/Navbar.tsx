'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Compass, Plus, Search, Layers, Moon, Sun, ChevronDown } from 'lucide-react';
import { PersonaSwitcher } from './PersonaSwitcher';
import { SearchDialog } from './SearchDialog';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
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
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);

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
    { href: '/', label: 'Feed', icon: Sparkles },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/collections', label: 'Collections', icon: Layers },
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
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest -mt-1 hidden sm:block">
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
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-full border border-border/80 bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-all shadow-inner group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="truncate">Search spaces, topics, aesthetics...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-background border border-border text-muted-foreground">
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
              className="sm:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600" />
                )}
              </button>
            )}

            {/* Unified Creation CTA Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
                aria-expanded={isCreateMenuOpen}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Tạo mới</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isCreateMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isCreateMenuOpen && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    className="fixed inset-0 z-30 bg-transparent"
                    onClick={() => setIsCreateMenuOpen(false)}
                  />

                  {/* Dropdown Menu with 2 rows */}
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-zinc-200/90 dark:border-border/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-xl dark:shadow-2xl z-40 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    {/* Row 1: Tạo Space */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        setIsCreateSpaceModalOpen(true);
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all text-left group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-foreground flex items-center gap-1.5">
                          <span>Tạo Space</span>
                          <span className="text-[10px] font-normal text-indigo-500 dark:text-indigo-400 font-mono">(Community)</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-muted-foreground leading-snug mt-0.5">
                          Sáng lập cộng đồng trực quan hoặc không gian thẩm mỹ mới
                        </p>
                      </div>
                    </button>

                    {/* Row 2: Tạo Drop */}
                    <Link
                      href="/drop/new"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all text-left group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-foreground flex items-center gap-1.5">
                          <span>Tạo Drop</span>
                          <span className="text-[10px] font-normal text-emerald-500 dark:text-emerald-400 font-mono">(Visual Post)</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-muted-foreground leading-snug mt-0.5">
                          Đăng tải hình ảnh, câu chuyện và thông số kỹ thuật vào Space
                        </p>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>

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

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={isCreateSpaceModalOpen}
        onClose={() => setIsCreateSpaceModalOpen(false)}
      />
    </>
  );
}
