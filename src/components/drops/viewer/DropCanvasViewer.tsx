'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  Palette,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getMediaVariantUrl, getResponsiveImageProps } from '@/lib/media/responsive';

export interface DropMediaItem {
  id?: string;
  url: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  variants?: string | Record<string, string> | null;
}

interface DropCanvasViewerProps {
  media: DropMediaItem[];
  palette?: string[];
  dropTitle: string;
  dropId: string;
  showPalette?: boolean;
  isMobileCompact?: boolean;
}

export function DropCanvasViewer({
  media,
  palette = [],
  dropTitle,
  dropId,
  showPalette = false,
  isMobileCompact = false,
}: DropCanvasViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeMedia = media[activeIndex] || media[0];
  const hasMultiple = media.length > 1;

  const handleNext = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((prev) => (prev + 1) % media.length);
  }, [hasMultiple, media.length]);

  const handlePrev = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [hasMultiple, media.length]);

  // Keyboard navigation for carousel and lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handleNext, handlePrev]);

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

  const handleCopyLink = () => {
    try {
      const url = `${window.location.origin}/drop/${dropId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success('Đã sao chép liên kết tác phẩm');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Không thể sao chép liên kết');
    }
  };

  if (!activeMedia) {
    return (
      <div className="w-full aspect-16/10 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-center text-muted-foreground text-xs">
        Chưa có hình ảnh tác phẩm
      </div>
    );
  }

  const aspectRatio = activeMedia.aspectRatio || (activeMedia.width && activeMedia.height ? activeMedia.width / activeMedia.height : 1.5);

  const mainStageImage = getResponsiveImageProps(activeMedia, {
    defaultVariant: 'large',
    sizes: isMobileCompact
      ? '(max-width: 640px) 100vw, 680px'
      : '(max-width: 768px) 100vw, (max-width: 1280px) 67vw, 840px',
  });

  return (
    <div className={isMobileCompact ? 'space-y-0' : 'space-y-4 sm:space-y-6'}>
      {/* Main Exhibition Stage */}
      <div
        className={
          isMobileCompact
            ? 'relative group overflow-hidden bg-secondary/30 dark:bg-black/40 flex items-center justify-center max-h-[440px] sm:max-h-[500px]'
            : 'relative group rounded-2xl sm:rounded-3xl overflow-hidden border border-border/80 bg-secondary/30 shadow-xs flex items-center justify-center max-h-[64vh] lg:max-h-[72vh] xl:max-h-[720px]'
        }
      >
        <div
          className={`relative w-full flex items-center justify-center overflow-hidden cursor-zoom-in ${
            isMobileCompact
              ? 'max-h-[440px] sm:max-h-[500px]'
              : 'max-h-[64vh] lg:max-h-[72vh] xl:max-h-[720px]'
          }`}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
            maxHeight: isMobileCompact ? 'min(500px, 58vh)' : undefined,
          }}
          onClick={() => setIsLightboxOpen(true)}
        >
          <img
            src={mainStageImage.src}
            srcSet={mainStageImage.srcSet}
            sizes={mainStageImage.sizes}
            alt={`${dropTitle} - Tác phẩm ${activeIndex + 1}`}
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              isMobileCompact
                ? 'max-h-[440px] sm:max-h-[500px]'
                : 'max-h-[64vh] lg:max-h-[72vh] xl:max-h-[720px]'
            }`}
            loading="eager"
            decoding="async"
          />

          {/* Canvas Floating Tools */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            {!isMobileCompact && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                title="Sao chép liên kết tác phẩm"
                aria-label="Sao chép liên kết tác phẩm"
                className="p-2.5 rounded-full bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/70 shadow-xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              title="Xem toàn màn hình"
              aria-label="Xem toàn màn hình"
              className={
                isMobileCompact
                  ? 'p-2 rounded-full bg-background/80 hover:bg-background text-foreground backdrop-blur-md border border-border/70 shadow-xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer'
                  : 'p-2.5 rounded-full bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/70 shadow-xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer'
              }
            >
              <Maximize2 className={isMobileCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>

          {/* Navigation Arrows for Multi-Media */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Tác phẩm trước"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/70 shadow-xs transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Tác phẩm kế tiếp"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/70 shadow-xs transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Multi-Asset Indicator Badge */}
          {hasMultiple && (
            <div
              className={`absolute bottom-3 left-3 z-20 px-2.5 py-0.5 rounded-full font-semibold bg-background/85 backdrop-blur-md text-foreground border border-border/70 shadow-xs ${
                isMobileCompact ? 'text-[11px]' : 'text-xs px-3 py-1'
              }`}
            >
              {isMobileCompact ? `${activeIndex + 1} / ${media.length}` : `Ảnh ${activeIndex + 1} / ${media.length}`}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Asset Thumbnail Ribbon */}
      {hasMultiple && (
        <div
          className={
            isMobileCompact
              ? 'px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none bg-secondary/15 border-t border-border/50'
              : 'flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none'
          }
        >
          {media.map((item, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Xem ảnh ${idx + 1}`}
                className={`relative shrink-0 overflow-hidden border transition-all cursor-pointer ${
                  isMobileCompact
                    ? 'w-12 h-12 sm:w-14 sm:h-14 rounded-xl'
                    : 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl'
                } ${
                  isCurrent
                    ? 'border-foreground ring-2 ring-foreground/20 scale-100 shadow-xs'
                    : 'border-border/80 opacity-70 hover:opacity-100 hover:border-foreground/40'
                }`}
              >
                <img
                  src={getMediaVariantUrl(item, 'thumb', item.url)}
                  alt={`Thu nhỏ ảnh ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Aesthetic Color Palette (Interactive Hex Swatches - Full Card for Desktop) */}
      {showPalette && palette && palette.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Bảng màu Thẩm mỹ</span>
            <span className="text-muted-foreground font-normal text-[11px] hidden md:inline">
              (Nhấn để chép mã màu HEX)
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {palette.map((color, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleCopyColor(color)}
                title={`Sao chép ${color}`}
                aria-label={`Mã màu ${color}`}
                className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 hover:bg-secondary border border-border/80 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 shrink-0 shadow-2xs"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-xs font-medium text-foreground">
                  {color}
                </span>
                {copiedColor === color && (
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Top Header */}
          <div className="w-full max-w-7xl flex items-center justify-between text-white z-20">
            <div className="min-w-0 pr-4">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {dropTitle}
              </h2>
              {hasMultiple && (
                <p className="text-xs text-white/70">
                  Ảnh {activeIndex + 1} trên tổng số {media.length}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Sao chép liên kết"
                aria-label="Sao chép liên kết"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Đóng toàn màn hình (Esc)"
                aria-label="Đóng toàn màn hình (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Central Media */}
          <div
            className="relative flex-1 w-full max-w-6xl flex items-center justify-center p-2 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getMediaVariantUrl(activeMedia, 'detail', activeMedia.url)}
              alt={dropTitle}
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl"
              decoding="async"
            />

            {/* Lightbox Carousel Controls */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Ảnh trước"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Ảnh kế tiếp"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Footer Instruction */}
          <div className="text-center text-xs text-white/50 pb-2">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono">Esc</kbd> hoặc chạm vào nền để thoát chế độ xem
          </div>
        </div>
      )}
    </div>
  );
}
