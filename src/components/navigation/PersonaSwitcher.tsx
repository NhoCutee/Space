'use client';

import { useState } from 'react';
import { switchPersona } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { Users, Check, Sparkles, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface PersonaSwitcherProps {
  currentUsername?: string;
  currentDisplayName?: string;
  currentAvatar?: string | null;
}

const PERSONAS = [
  {
    username: 'maya_curates',
    displayName: 'Maya Lin',
    role: 'Giám tuyển Thẩm mỹ & Cà phê',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'kenji_shoots',
    displayName: 'Kenji Sato',
    role: 'Nhiếp ảnh gia Đường phố Tokyo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    username: 'elena_builds',
    displayName: 'Elena Vance',
    role: 'Nhà chế tác Phím cơ & Không gian',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  },
];

export function PersonaSwitcher({
  currentUsername = 'maya_curates',
  currentDisplayName = 'Maya Lin',
  currentAvatar,
}: PersonaSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSwitch = async (username: string, name: string) => {
    setLoading(true);
    try {
      await switchPersona(username);
      toast.success(`Đã chuyển sang tài khoản ${name}`);
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error('Không thể chuyển tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium border border-border/80 bg-background/80 hover:bg-accent hover:text-accent-foreground transition-all duration-200 cursor-pointer"
        aria-label="Chuyển tài khoản persona"
      >
        <img
          src={currentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
          alt={currentDisplayName}
          className="w-5 h-5 rounded-full object-cover ring-1 ring-border"
        />
        <span className="font-semibold text-foreground truncate max-w-[100px] hidden sm:inline">
          {currentDisplayName}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider bg-secondary px-1.5 py-0.5 rounded-md hidden sm:inline-block">
          Demo
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 p-2 rounded-2xl glass shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-border/50">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Chuyển đổi tài khoản thử nghiệm</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Trải nghiệm góc nhìn từ các nhà sáng tạo khác nhau
              </p>
            </div>

            <div className="space-y-1 mt-1.5">
              {PERSONAS.map((p) => {
                const isActive = p.username === currentUsername;
                return (
                  <button
                    key={p.username}
                    disabled={loading}
                    onClick={() => handleSwitch(p.username, p.displayName)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-secondary font-medium'
                        : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.avatar}
                        alt={p.displayName}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {p.displayName}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {p.role}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-border/50 px-2">
              <a
                href="/onboarding"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 text-center text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Trải nghiệm luồng người dùng mới</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
