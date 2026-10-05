'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Check,
  Compass,
  ArrowRight,
  Loader2,
  Users,
  Layers,
} from 'lucide-react';
import { completeOnboarding } from '@/actions/auth';
import { getSpaces } from '@/actions/spaces';
import { toast } from 'sonner';

interface StarterSpace {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  coverImageUrl: string;
  membersCount: number;
}

const AVAILABLE_INTERESTS = [
  { id: 'Photography', label: 'Photography', icon: '📷', desc: 'Street, analog & 35mm captures' },
  { id: 'Coffee', label: 'Coffee & Cafes', icon: '☕', desc: 'Espresso, pour-over & aesthetics' },
  { id: 'Keyboards', label: 'Keyboards', icon: '⌨️', desc: 'Custom mechanical switches & keycaps' },
  { id: 'Gaming', label: 'Gaming Setups', icon: '🎮', desc: 'Battlestations & ambient setups' },
  { id: 'Streetwear', label: 'Streetwear', icon: '👟', desc: 'Tokyo silhouettes & archival fashion' },
  { id: 'Interior', label: 'Interior Design', icon: '🛋️', desc: 'Minimalist living & tactile crafts' },
  { id: 'Workspace', label: 'Desk Setup', icon: '🖥️', desc: 'Productivity spaces & clean geometry' },
  { id: 'Architecture', label: 'Architecture', icon: '🏛️', desc: 'Brutalist, urban & contemporary forms' },
  { id: 'Travel', label: 'Travel & Cities', icon: '✈️', desc: 'Culture, serene corners & exploration' },
  { id: 'Tech', label: 'Tech & Hardware', icon: '⚡', desc: 'Industrial design & modern gadgets' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [spaces, setSpaces] = useState<StarterSpace[]>([]);
  const [selectedSpaces, setSelectedSpaces] = useState<Set<string>>(new Set());
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load starter spaces
  useEffect(() => {
    setLoadingSpaces(true);
    getSpaces()
      .then((res) => {
        const mapped = res.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          category: s.category,
          description: s.description,
          coverImageUrl: s.coverImageUrl,
          membersCount: s.membersCount,
        }));
        setSpaces(mapped);
        // Pre-select top 2 spaces by default
        const initial = new Set(mapped.slice(0, 2).map((s) => s.id));
        setSelectedSpaces(initial);
      })
      .catch((err) => {
        console.error('Failed to load starter spaces:', err);
      })
      .finally(() => {
        setLoadingSpaces(false);
      });
  }, []);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];

      // Auto-recommend spaces matching newly selected interest
      if (!prev.includes(id) && spaces.length > 0) {
        const matching = spaces.filter((s) =>
          s.category.toLowerCase().includes(id.toLowerCase()) ||
          s.name.toLowerCase().includes(id.toLowerCase())
        );
        if (matching.length > 0) {
          setSelectedSpaces((sPrev) => {
            const nextSet = new Set(sPrev);
            matching.forEach((m) => nextSet.add(m.id));
            return nextSet;
          });
        }
      }

      return next;
    });
  };

  const toggleSpace = (spaceId: string) => {
    setSelectedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  };

  const handleFinish = async () => {
    if (selectedInterests.length < 3) {
      toast.error('Vui lòng chọn ít nhất 3 chủ đề quan tâm');
      return;
    }

    setSubmitting(true);
    try {
      const res = await completeOnboarding(
        selectedInterests,
        Array.from(selectedSpaces)
      );

      if (!res.success) {
        toast.error(res.error || 'Hoàn tất thiết lập thất bại');
        return;
      }

      toast.success('Thiết lập thành công! Chào mừng bạn đến với Spaces');
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Đã xảy ra lỗi trong quá trình lưu');
    } finally {
      setSubmitting(false);
    }
  };

  const minRequired = 3;
  const remaining = Math.max(0, minRequired - selectedInterests.length);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Chào mừng đến với Spaces</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Cá nhân hóa nguồn cảm hứng
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
          Chọn các chủ đề thẩm mỹ và không gian thị giác bạn quan tâm để định hình bảng tin trang chủ của bạn ngay từ phiên đầu tiên.
        </p>
      </div>

      {/* Step 1: Select Interests */}
      <div className="p-6 rounded-3xl border border-border/70 bg-card/60 shadow-xs mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <span>1. Chọn chủ đề yêu thích</span>
              <span className="text-xs font-normal text-muted-foreground">
                (Ít nhất 3 chủ đề)
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hệ thống sẽ gợi ý các Không gian và bài đăng phù hợp với bạn
            </p>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              remaining === 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {remaining === 0 ? '✓ Đã đủ điều kiện' : `Còn thiếu ${remaining}`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {AVAILABLE_INTERESTS.map((item) => {
            const isSelected = selectedInterests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10 text-foreground ring-2 ring-indigo-500/20'
                    : 'border-border/70 bg-background hover:bg-secondary/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{item.icon}</span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Starter Spaces */}
      <div className="p-6 rounded-3xl border border-border/70 bg-card/60 shadow-xs mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>2. Tham gia Không gian gợi ý khởi đầu</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Các bài đăng từ những không gian này sẽ xuất hiện ngay trên trang chủ của bạn
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
            {selectedSpaces.size} đã chọn
          </span>
        </div>

        {loadingSpaces ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Đang tải các không gian tiêu biểu...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {spaces.map((s) => {
              const isJoined = selectedSpaces.has(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggleSpace(s.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center ${
                    isJoined
                      ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                      : 'border-border/60 bg-background hover:bg-secondary/40'
                  }`}
                >
                  <img
                    src={s.coverImageUrl}
                    alt={s.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-border/60"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground truncate">
                        {s.name}
                      </span>
                      {isJoined ? (
                        <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          + Tham gia
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {s.category}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-0.5">
                      <Users className="w-2.5 h-2.5" />
                      <span>{s.membersCount} thành viên</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="sticky bottom-6 z-20 p-4 rounded-2xl glass border border-border/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground flex items-center gap-2 text-center sm:text-left">
          <Layers className="w-4 h-4 text-indigo-400 shrink-0 hidden sm:inline" />
          <span>
            {remaining > 0
              ? `Vui lòng chọn thêm ${remaining} chủ đề để mở khóa Trang chủ`
              : `Sẵn sàng khám phá với ${selectedInterests.length} sở thích và ${selectedSpaces.size} không gian`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleFinish}
          disabled={submitting || remaining > 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-sm active:scale-98"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang lưu thiết lập...</span>
            </>
          ) : (
            <>
              <span>Hoàn tất & Khám phá Trang chủ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
