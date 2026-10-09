'use client';

import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DropAestheticPaletteProps {
  palette: string[];
}

export function DropAestheticPalette({ palette }: DropAestheticPaletteProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  if (!palette || palette.length === 0) return null;

  const handleCopyColor = (color: string) => {
    try {
      navigator.clipboard.writeText(color);
      setCopiedColor(color);
      toast.success(`Đã sao chép mã màu ${color}`);
      setTimeout(() => setCopiedColor(null), 2000);
    } catch {
      toast.error('Không thể sao chép mã màu');
    }
  };

  return (
    <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
        <Palette className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>Bảng màu:</span>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        {palette.map((color, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCopyColor(color)}
            title={`Nhấn để sao chép ${color}`}
            aria-label={`Mã màu ${color}`}
            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/70 hover:bg-secondary text-foreground border border-border/70 text-xs font-mono transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
          >
            <span
              className="w-3 h-3 rounded-full border border-black/15 dark:border-white/20 shrink-0 shadow-2xs"
              style={{ backgroundColor: color }}
            />
            <span>{color}</span>
            {copiedColor === color && (
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
