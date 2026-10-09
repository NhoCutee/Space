'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Compass,
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  User as UserIcon,
  Tag,
  CornerDownLeft,
} from 'lucide-react';
import { searchAll, UnifiedSearchResults } from '@/actions/search';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchCategoryTab = 'all' | 'spaces' | 'drops' | 'users' | 'topics';

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResults>({
    spaces: [],
    drops: [],
    users: [],
    topics: [],
    totalResults: 0,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchCategoryTab>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load initial popular results or search query with debounce
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => {
      searchAll(query)
        .then((res) => {
          setResults(res);
          setSelectedIndex(0);
        })
        .catch((err) => {
          console.error('Search error:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, query ? 150 : 0);

    return () => clearTimeout(timeoutId);
  }, [isOpen, query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Flatten active items for keyboard navigation
  const visibleItems = (() => {
    const items: Array<{
      type: 'space' | 'drop' | 'user' | 'topic';
      id: string;
      title: string;
      subtitle: string;
      url: string;
      image?: string | null;
    }> = [];

    if (activeTab === 'all' || activeTab === 'spaces') {
      results.spaces.forEach((s) => {
        items.push({
          type: 'space',
          id: `space-${s.id}`,
          title: s.name,
          subtitle: `${s.category} • ${s.membersCount} thành viên`,
          url: `/s/${s.slug}`,
          image: s.coverImageUrl,
        });
      });
    }

    if (activeTab === 'all' || activeTab === 'drops') {
      results.drops.forEach((d) => {
        items.push({
          type: 'drop',
          id: `drop-${d.id}`,
          title: d.title,
          subtitle: `trong ${d.spaceName} • bởi ${d.authorName}`,
          url: `/drop/${d.id}`,
          image: d.mediaUrl,
        });
      });
    }

    if (activeTab === 'all' || activeTab === 'users') {
      results.users.forEach((u) => {
        items.push({
          type: 'user',
          id: `user-${u.id}`,
          title: u.displayName,
          subtitle: `@${u.username}${u.bio ? ` • ${u.bio}` : ''}`,
          url: `/u/${encodeURIComponent(u.username)}`,
          image: u.avatarUrl,
        });
      });
    }

    if (activeTab === 'all' || activeTab === 'topics') {
      results.topics.forEach((t) => {
        items.push({
          type: 'topic',
          id: `topic-${t.tag}`,
          title: `#${t.tag}`,
          subtitle: `${t.category} • ${t.count} không gian`,
          url: `/explore?category=${encodeURIComponent(t.tag)}`,
        });
      });
    }

    return items;
  })();

  // Handle keyboard navigation: ArrowUp, ArrowDown, Enter, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < visibleItems.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : visibleItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = visibleItems[selectedIndex];
        if (selected) {
          onClose();
          router.push(selected.url);
        } else if (query.trim()) {
          onClose();
          router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, visibleItems, selectedIndex, query, onClose, router]);

  if (!isOpen) return null;

  const handleSelectItem = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-0 sm:pt-20 px-0 sm:px-4 bg-background/90 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl h-full sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-3xl border-0 sm:border border-border/80 bg-card shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-5 border-b border-border/60 flex items-center gap-2.5 sm:gap-3">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
          <input
            id="search-dialog-input"
            name="query"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm Không gian, Tác phẩm, Nghệ sĩ... (⌘K)"
            aria-label="Tìm kiếm Không gian, Tác phẩm, Nghệ sĩ hoặc Chủ đề"
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono font-semibold text-muted-foreground bg-secondary rounded-lg border border-border/60">
              ESC
            </kbd>
          )}

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden p-1.5 rounded-full text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
            aria-label="Đóng tìm kiếm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills Bar */}
        <div className="px-4 py-2 bg-secondary/30 border-b border-border/50 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'spaces', label: `Không gian (${results.spaces.length})` },
              { id: 'drops', label: `Tác phẩm (${results.drops.length})` },
              { id: 'users', label: `Nghệ sĩ (${results.users.length})` },
              { id: 'topics', label: `Chủ đề (${results.topics.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-border/30">
          {visibleItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {query ? `Không tìm thấy kết quả cho "${query}"` : 'Nhập từ khóa để tìm kiếm'}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Thử tìm theo tên quán cà phê, bàn phím cơ, phong cách đường phố hoặc địa danh.
              </p>
            </div>
          ) : (
            visibleItems.map((item, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item.url)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-secondary/80 text-foreground ring-1 ring-border/80'
                      : 'hover:bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-border/50 shrink-0"
                      />
                    ) : item.type === 'space' ? (
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5" />
                      </div>
                    ) : item.type === 'drop' ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    ) : item.type === 'user' ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                        <Tag className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                        <span>{item.title}</span>
                        <span className="text-xs font-normal uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground shrink-0">
                          {item.type === 'space'
                            ? 'Không gian'
                            : item.type === 'drop'
                              ? 'Tác phẩm'
                              : item.type === 'user'
                                ? 'Nghệ sĩ'
                                : 'Chủ đề'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                    {isSelected && (
                      <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-zinc-400">
                        <span>Chọn</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    )}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-secondary/20 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              <kbd className="font-mono bg-secondary px-1.5 py-0.5 rounded border border-border/50">↑</kbd>{' '}
              <kbd className="font-mono bg-secondary px-1.5 py-0.5 rounded border border-border/50">↓</kbd> để di chuyển
            </span>
            <span className="hidden sm:inline">
              <kbd className="font-mono bg-secondary px-1.5 py-0.5 rounded border border-border/50">↵</kbd> để mở
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (query.trim()) {
                onClose();
                router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
              }
            }}
            className="text-xs font-semibold text-foreground hover:underline ml-auto flex items-center gap-1"
          >
            <span>Xem toàn bộ kết quả</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
