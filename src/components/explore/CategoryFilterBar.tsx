'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState, useEffect, useTransition } from 'react';

const CATEGORIES = [
  'All',
  'Coffee & Lifestyle',
  'Tech & Workspaces',
  'Tech & Craft',
  'Photography',
  'Fashion & Style',
  'Interior & Architecture',
  'Design & Tech',
  'Travel & Culture',
];

export function CategoryFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'All';
  const currentQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(currentQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  const handleCategorySelect = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'All') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    startTransition(() => {
      router.push(`/explore?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.push(`/explore?${params.toString()}`);
    });
  };

  const handleClearSearch = () => {
    setQuery('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    startTransition(() => {
      router.push(`/explore?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spaces by topic, craft, or aesthetic..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-border/80 bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-all shadow-inner cursor-text"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Horizontal Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((category) => {
          const isActive = currentCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => handleCategorySelect(category)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/50'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
