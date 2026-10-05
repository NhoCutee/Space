'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Compass,
  Flame,
  ArrowRight,
  Layers,
  Heart,
  MessageSquare,
  Bookmark,
  Check,
  Plus,
} from 'lucide-react';
import { HomeFeedData } from '@/actions/feed';
import { ScoredSpace } from '@/lib/recommendations/scoring';
import { ExplainableBadge } from './ExplainableBadge';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { toggleSpaceMembership } from '@/actions/spaces';
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

  const { user, isNewUser, trendingSpaces, feedDrops, joinedSpaces } = initialData;

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
        toast.error(res.error || 'Cập nhật trạng thái thất bại');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật');
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
      {isNewUser && (
        <div className="relative rounded-3xl p-6 sm:p-8 bg-card border border-border/80 overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Khởi đầu trải nghiệm</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Chào mừng bạn đến với Spaces!
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Khám phá các cộng đồng thị giác theo chủ đề, tay nghề và thẩm mỹ. Hãy chọn 3 chủ đề yêu thích để cá nhân hóa bảng tin trang chủ của bạn ngay bây giờ.
              </p>
            </div>

            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer shrink-0 active:scale-98"
            >
              <span>Thiết lập sở thích (1 phút)</span>
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
            Tổng hợp các Không gian và bài đăng phù hợp với góc nhìn thẩm mỹ của bạn
          </p>
        </div>

        {/* Filter Control (small-controls.md segmented control) */}
        <div className="inline-flex items-center p-1 rounded-xl bg-secondary/70 border border-border/70 text-xs">
          {(
            [
              { id: 'all', label: 'Tất cả gợi ý' },
              { id: 'joined', label: `Không gian đã tham gia (${joinedSpaces.length})` },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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

      {/* SECTION 1: Recommended Spaces for You */}
      {recommendedSpaces.length > 0 && activeFilter === 'all' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-500" />
                <span>Không gian gợi ý cho bạn</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Được chọn lọc dựa trên sở thích và hành vi khám phá của bạn
              </p>
            </div>
            <Link
              href="/explore"
              className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommendedSpaces.map((space) => (
              <div
                key={space.id}
                className="group relative rounded-2xl border border-border/80 bg-card overflow-hidden hover:border-border transition-all flex flex-col justify-between"
              >
                {/* Cover Image */}
                <div className="relative aspect-16/9 overflow-hidden bg-secondary">
                  <img
                    src={space.coverImageUrl}
                    alt={space.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                  {/* Explainable Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
                    <ExplainableBadge
                      reason={space.reason}
                      className="bg-black/75 backdrop-blur-md text-white border-white/20 shadow-xs"
                    />
                  </div>

                  {/* Title & Category over cover */}
                  <div className="absolute bottom-3 left-3 right-3 z-10 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                      {space.category}
                    </span>
                    <h4 className="text-base font-bold truncate mt-0.5">
                      {space.name}
                    </h4>
                  </div>
                </div>

                {/* Body info */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {space.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {space.membersCount} thành viên • {space.dropsCount} Drops
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/s/${space.slug}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                      >
                        Khám phá
                      </Link>

                      {user && (
                        <button
                          type="button"
                          onClick={() => handleToggleJoin(space)}
                          disabled={joiningSpaceId === space.id}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            space.isJoined
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-foreground text-background hover:opacity-90'
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
                  </div>
                </div>
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
            {displayedDrops.length} Drops
          </span>
        </div>

        {displayedDrops.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40 max-w-lg mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Compass className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-foreground">
              {activeFilter === 'joined'
                ? 'Bạn chưa tham gia Không gian nào hoặc chưa có bài đăng'
                : 'Chưa có tác phẩm nào'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeFilter === 'joined'
                ? 'Hãy khám phá các Không gian nổi bật bên dưới và nhấn Tham gia để lấp đầy bảng tin của bạn.'
                : 'Hãy bắt đầu bằng việc xuất bản Drop đầu tiên hoặc tham gia các Không gian.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span>Xem tất cả gợi ý</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedDrops.map((drop) => {
              const primaryMedia = drop.media[0];
              return (
                <div
                  key={drop.id}
                  className="group rounded-2xl border border-border/80 bg-card overflow-hidden hover:border-border transition-all flex flex-col justify-between"
                >
                  {/* Media Image Container (Clean artwork without heavy obscuring overlays) */}
                  <Link href={`/drop/${drop.id}`} className="relative aspect-4/3 overflow-hidden bg-secondary block">
                    {primaryMedia ? (
                      <img
                        src={primaryMedia.url}
                        alt={drop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}

                    {/* Subtle bottom gradient for location tag */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 group-hover:opacity-85 transition-opacity" />

                    {/* Location or Time on Media */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[11px] text-white/90">
                      <span className="truncate font-medium">
                        {drop.locationName || drop.space.category}
                      </span>
                      <RelativeTime createdAt={drop.createdAt} className="shrink-0 text-[10px] text-white/80" />
                    </div>
                  </Link>

                  {/* Details Card */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      {/* Meta header: Space Link + Sleek Explainable Badge */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <Link
                          href={`/s/${drop.space.slug}`}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider truncate"
                        >
                          {drop.space.name}
                        </Link>
                        <ExplainableBadge reason={drop.reason} className="shrink-0 text-[10px] py-0 px-2" />
                      </div>

                      {/* Drop Title */}
                      <Link href={`/drop/${drop.id}`} className="block">
                        <h4 className="text-sm font-semibold text-foreground hover:text-indigo-500 transition-colors line-clamp-1">
                          {drop.title}
                        </h4>
                      </Link>

                      {/* Narrative Snippet */}
                      {drop.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {drop.content}
                        </p>
                      )}
                    </div>

                    {/* Author & Social Meta */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={drop.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
                          alt={drop.user.displayName}
                          className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-border"
                        />
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {drop.user.displayName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 text-[11px]">
                        <span className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                          <Heart className="w-3.5 h-3.5" />
                          <span>{drop.reactionsCount}</span>
                        </span>
                        <span className="flex items-center gap-1 hover:text-indigo-500 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{drop.commentsCount}</span>
                        </span>
                        <span className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{drop.savesCount}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Trending Spaces */}
      <section className="space-y-4 pt-6 border-t border-border/60">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Không gian đang thịnh hành</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Các cộng đồng đang có hoạt động xuất bản và trao đổi sôi nổi nhất
            </p>
          </div>
          <Link
            href="/explore"
            className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <span>Khám phá thêm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trendingSpaces.map((space) => (
            <Link
              key={space.id}
              href={`/s/${space.slug}`}
              className="group p-4 rounded-2xl border border-border/80 bg-card hover:bg-secondary/40 hover:border-border transition-all flex items-center gap-4"
            >
              <img
                src={space.coverImageUrl}
                alt={space.name}
                className="w-16 h-16 rounded-xl object-cover ring-1 ring-border/60 shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                  {space.category}
                </div>
                <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-indigo-500 transition-colors">
                  {space.name}
                </h4>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {space.description}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                  <span>{space.membersCount} thành viên</span>
                  <span>•</span>
                  <span>{space.dropsCount} Drops</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
