'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Compass, Users, Sparkles, ArrowRight } from 'lucide-react';
import { getSpaces } from '@/actions/spaces';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpaceResult {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  membersCount: number;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [spaces, setSpaces] = useState<SpaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load spaces on mount or when opening
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getSpaces()
        .then((res) => {
          setSpaces(
            res.map((s) => ({
              id: s.id,
              slug: s.slug,
              name: s.name,
              description: s.description,
              category: s.category,
              coverImageUrl: s.coverImageUrl,
              membersCount: s.membersCount,
            }))
          );
        })
        .finally(() => {
          setLoading(false);
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        });
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter spaces based on query
  const filteredSpaces = query.trim()
    ? spaces.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()) ||
          s.category.toLowerCase().includes(query.toLowerCase())
      )
    : spaces.slice(0, 5); // default show top 5 spaces

  const handleSelectSpace = (slug: string) => {
    onClose();
    router.push(`/s/${slug}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onClose();
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl rounded-3xl border border-border/80 bg-card p-4 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center mb-3">
          <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spaces by topic, craft, or aesthetic..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-border/80 bg-secondary/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background border border-border rounded">
              ESC
            </kbd>
          )}
        </form>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>{query ? 'Matching Spaces' : 'Suggested Spaces'}</span>
            {query && (
              <span className="text-[10px] font-normal lowercase">
                press enter to search all
              </span>
            )}
          </div>

          {filteredSpaces.length > 0 ? (
            filteredSpaces.map((space) => (
              <button
                key={space.id}
                onClick={() => handleSelectSpace(space.slug)}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-secondary/80 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted shrink-0">
                    <img
                      src={space.coverImageUrl}
                      alt={space.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {space.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase tracking-wider font-semibold">
                        {space.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {space.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{space.membersCount}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all" />
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Loading spaces...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>No spaces match &quot;{query}&quot;</p>
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <span>Search on Explore directory</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="mt-3 pt-3 border-t border-border/50 px-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <button
              onClick={() => {
                onClose();
                router.push('/explore');
              }}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Browse all categories
            </button>
          </div>
          <span className="text-[10px]">
            Tip: Press <kbd className="px-1 py-0.5 bg-secondary rounded border border-border">↵ Enter</kbd> to explore
          </span>
        </div>
      </div>
    </div>
  );
}
