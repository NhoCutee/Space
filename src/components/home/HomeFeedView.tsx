'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Compass,
  ArrowRight,
  Layers,
  Bookmark,
  Check,
  Plus,
  X,
  MapPin,
} from 'lucide-react';
import { HomeFeedData } from '@/actions/feed';
import { ScoredSpace } from '@/lib/recommendations/scoring';
import { ExplainableBadge } from './ExplainableBadge';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toggleSpaceMembership } from '@/actions/spaces';
import { SaveToCollectionModal } from '@/components/drops/interactions/SaveToCollectionModal';
import { UserIdentity } from '@/components/user';
import { toast } from 'sonner';

interface HomeFeedViewProps {
  initialData: HomeFeedData;
}

export function HomeFeedView({ initialData }: HomeFeedViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'joined' | 'curated'>('all');
  const [recommendedSpaces, setRecommendedSpaces] = useState<ScoredSpace[]>(
    initialData.recommendedSpaces
  );
  const [joiningSpaceId, setJoiningSpaceId] = useState<string | null>(null);
  const [saveModalDrop, setSaveModalDrop] = useState<{ id: string; title: string } | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('spaces:dismissed-onboarding-banner') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleDismissBanner = () => {
    setDismissedBanner(true);
    try {
      localStorage.setItem('spaces:dismissed-onboarding-banner', 'true');
    } catch {}
  };

  const { user, isNewUser, feedDrops, joinedSpaces } = initialData;

  const handleQuickSave = (dropId: string, dropTitle: string) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu tác phẩm vào bộ sưu tập');
      return;
    }
    setSaveModalDrop({ id: dropId, title: dropTitle });
  };

  const handleToggleJoin = async (space: ScoredSpace) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để tham gia không gian');
      return;
    }

    setJoiningSpaceId(space.id);
    try {
      const res = await toggleSpaceMembership(space.id);
      if (res.success) {
        setRecommendedSpaces((prev) =>
          prev.map((s) =>
            s.id === space.id
              ? {
                  ...s,
                  isJoined: res.isJoined,
                  membersCount: res.membersCount,
                }
              : s
          )
        );
        toast.success(
          res.isJoined
            ? `Đã tham gia ${space.name}`
            : `Đã rời ${space.name}`
        );
      } else {
        toast.error(res.error || 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
      }
    } catch {
      toast.error('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setJoiningSpaceId(null);
    }
  };

  // Filter drops client-side for instant switching
  const displayedDrops = feedDrops.filter((d) => {
    if (activeFilter === 'joined') {
      return joinedSpaces.some((s) => s.id === d.space.id);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Onboarding Banner for New Users */}
      {isNewUser && !dismissedBanner && (
        <div className="relative rounded-2xl p-6 sm:p-8 bg-card border border-border/80 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={handleDismissBanner}
            className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pr-8 sm:pr-0">
            <div className="max-w-xl">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Chào mừng bạn đến với Spaces
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Cá nhân hóa bảng tin theo chủ đề và gu thẩm mỹ yêu thích của bạn.
              </p>
            </div>

            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-foreground text-background hover:opacity-90 transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm"
            >
              <span>Thiết lập sở thích</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Navigation Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span>Khám phá Thị giác</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tổng hợp các Không gian và tác phẩm phù hợp với góc nhìn thẩm mỹ của bạn
          </p>
        </div>

        {/* Filter Control (small-controls.md segmented control) */}
        <div className="inline-flex items-center p-1 rounded-xl bg-secondary/70 border border-border/70 text-xs">
          {(
            [
              { id: 'all', label: 'Tất cả gợi ý' },
              { id: 'joined', label: `Đã tham gia (${joinedSpaces.length})` },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none ${
                activeFilter === filter.id
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: Curated Spaces Discovery Rail */}
      {recommendedSpaces.length > 0 && activeFilter === 'all' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              <span>Không gian tuyển chọn</span>
            </h3>
            <Link
              href="/explore"
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-stretch gap-4 overflow-x-auto pb-2 px-1 scrollbar-none snap-x snap-mandatory">
            {recommendedSpaces.map((space) => (
              <div
                key={space.id}
                className="w-72 sm:w-80 shrink-0 snap-start rounded-2xl border border-border/80 bg-card p-3 flex items-center justify-between gap-3 hover:border-foreground/30 hover:shadow-xs transition-all"
              >
                <Link href={`/s/${space.slug}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                  <img
                    src={space.coverImageUrl}
                    alt={space.name}
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-border/60 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate">
                      {space.category}
                    </div>
                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {space.name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {space.membersCount} thành viên
                    </p>
                  </div>
                </Link>

                {user && (
                  <button
                    type="button"
                    onClick={() => handleToggleJoin(space)}
                    disabled={joiningSpaceId === space.id}
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none ${
                      space.isJoined
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-foreground text-background hover:opacity-90 shadow-xs'
                    }`}
                  >
                    {space.isJoined ? (
                      <>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Đã tham gia</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Tham gia</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: Visual Drops Feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>
                {activeFilter === 'joined'
                  ? 'Tác phẩm từ Không gian bạn đã tham gia'
                  : 'Nguồn cảm hứng thị giác gần đây'}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeFilter === 'joined'
                ? 'Cập nhật liên tục từ những cộng đồng bạn quan tâm'
                : 'Mỗi tác phẩm đều đi kèm lý do được gợi ý tới bảng tin của bạn'}
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {displayedDrops.length} tác phẩm
          </span>
        </div>

        {displayedDrops.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40 max-w-lg mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Compass className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-foreground">
              {activeFilter === 'joined'
                ? 'Chưa có tác phẩm mới từ các Không gian đã tham gia'
                : 'Chưa có tác phẩm nào'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeFilter === 'joined'
                ? 'Hãy tham gia thêm các Không gian tuyển chọn bên trên để theo dõi các sáng tạo thị giác mới nhất.'
                : 'Hãy bắt đầu bằng việc xuất bản tác phẩm đầu tiên hoặc tham gia các Không gian.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span>Khám phá tất cả tác phẩm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 [column-fill:_balance]">
            {displayedDrops.map((drop) => {
              const primaryMedia = drop.media[0];
              const aspectRatioValue = primaryMedia?.width && primaryMedia?.height
                ? `${primaryMedia.width} / ${primaryMedia.height}`
                : primaryMedia?.aspectRatio
                  ? `${primaryMedia.aspectRatio}`
                  : '16 / 10';

              return (
                <div
                  key={drop.id}
                  className="break-inside-avoid mb-5 group rounded-2xl border border-border/80 bg-card overflow-hidden hover:border-foreground/30 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Media Image Container (Pure Visual Artwork - No Gradient Corruption) */}
                  <Link href={`/drop/${drop.id}`} className="relative overflow-hidden bg-secondary block">
                    {primaryMedia ? (
                      <div
                        className="relative w-full overflow-hidden flex items-center justify-center"
                        style={{ aspectRatio: aspectRatioValue }}
                      >
                        <img
                          src={primaryMedia.url}
                          alt={drop.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />

                        {/* Quick Save Bookmark button floating on image (accessible on touch) */}
                        <div className="absolute top-2.5 right-2.5 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickSave(drop.id, drop.title);
                            }}
                            className="p-2 rounded-full bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/60 shadow-sm transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none cursor-pointer"
                            title="Lưu vào bộ sưu tập"
                            aria-label="Lưu vào bộ sưu tập"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-16/10 flex items-center justify-center text-muted-foreground text-xs">
                        Chưa có hình ảnh
                      </div>
                    )}
                  </Link>

                  {/* Details Card */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      {/* Space Link */}
                      <div className="flex items-center justify-between gap-2 min-w-0 mb-1">
                        <Link
                          href={`/s/${drop.space.slug}`}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider truncate"
                        >
                          {drop.space.name}
                        </Link>
                      </div>

                      {/* Drop Title */}
                      <Link href={`/drop/${drop.id}`} className="block mb-2">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1">
                          {drop.title}
                        </h4>
                      </Link>

                      {/* Explainable Badge: Prominent, clear, unclipped */}
                      <div className="mb-2 flex items-center">
                        <ExplainableBadge reason={drop.reason} />
                      </div>

                      {/* Location Badge (if present) */}
                      {drop.locationName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/80 mt-1">
                          <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{drop.locationName}</span>
                        </div>
                      )}

                      {/* Narrative Snippet (concise) */}
                      {drop.content && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
                          {drop.content}
                        </p>
                      )}
                    </div>

                    {/* Author Info & Single Truth Timestamp */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <UserIdentity
                        user={drop.user}
                        variant="compact"
                        size="xs"
                        className="min-w-0 max-w-[65%]"
                      />

                      <RelativeTime createdAt={drop.createdAt} className="shrink-0 text-xs text-muted-foreground/75" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Editorial Sign-off / Exhibition Footer */}
      <div className="pt-8 pb-4 text-center border-t border-border/40">
        <p className="text-xs font-medium text-muted-foreground">
          Bạn đã xem hết các gợi ý tuyển chọn hôm nay.
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Link
            href="/explore"
            className="px-4 py-2 rounded-full text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            Khám phá thêm Không gian
          </Link>
          <Link
            href="/create"
            className="px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Đăng tác phẩm mới
          </Link>
        </div>
      </div>

      {/* Save to Collection Modal */}
      {saveModalDrop && (
        <SaveToCollectionModal
          dropId={saveModalDrop.id}
          dropTitle={saveModalDrop.title}
          isOpen={Boolean(saveModalDrop)}
          onClose={() => setSaveModalDrop(null)}
        />
      )}
    </div>
  );
}
