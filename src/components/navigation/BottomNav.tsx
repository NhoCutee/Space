'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Compass, Plus, Layers, User, X } from 'lucide-react';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';

interface BottomNavProps {
  currentUsername?: string;
}

export function BottomNav({ currentUsername }: BottomNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);

  const links = [
    { href: '/', label: 'Feed', icon: Sparkles },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '#', label: 'Create', icon: Plus, isAction: true },
    { href: '/collections', label: 'Curated', icon: Layers },
    { href: currentUsername ? `/u/${currentUsername}` : '/onboarding', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Action Sheet for Creation */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="fixed bottom-20 left-4 right-4 bg-card/95 backdrop-blur-2xl border border-border/80 rounded-3xl p-3 shadow-2xl space-y-1.5 animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Tạo mới</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Row 1: Tạo Space */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setIsCreateSpaceModalOpen(true);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/70 active:bg-secondary transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>Tạo Space</span>
                  <span className="text-[10px] text-indigo-400 font-mono">(Community)</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Sáng lập cộng đồng trực quan hoặc không gian thẩm mỹ mới
                </p>
              </div>
            </button>

            {/* Row 2: Tạo Drop */}
            <Link
              href="/drop/new"
              onClick={() => setIsMenuOpen(false)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/70 active:bg-secondary transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>Tạo Drop</span>
                  <span className="text-[10px] text-emerald-400 font-mono">(Visual Post)</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Đăng tải hình ảnh, câu chuyện và thông số kỹ thuật vào Space
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/80 px-4 py-2">
        <div className="flex items-center justify-around">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            if (link.isAction) {
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`w-10 h-10 -mt-4 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer ${
                    isMenuOpen ? 'rotate-45' : ''
                  }`}
                  aria-label="Tạo mới"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
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

      {/* Create Space Modal on Mobile */}
      <CreateSpaceModal
        isOpen={isCreateSpaceModalOpen}
        onClose={() => setIsCreateSpaceModalOpen(false)}
      />
    </>
  );
}
