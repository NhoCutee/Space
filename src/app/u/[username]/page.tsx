import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getUserCollections } from '@/actions/collections';
import { DropCard } from '@/components/drops';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { CollectionCard } from '@/components/collections/CollectionCard';
import {
  Sparkles,
  ArrowLeft,
  Settings,
  Layers,
  Shield,
  Compass,
  Lock,
  Mail,
  Calendar,
  FolderHeart,
  UserCheck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { displayName: true, bio: true },
  });

  if (!user) {
    return { title: 'Người dùng không tồn tại — Spaces' };
  }

  return {
    title: `${user.displayName} (@${username}) — Spaces`,
    description: user.bio || `Hồ sơ cá nhân của ${user.displayName} trên Spaces Visual Commons`,
  };
}

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { tab = 'drops' } = await searchParams;

  // 1. Authoritative server-side resolution via username (Public Profile DTO)
  const [targetUser, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        interests: true,
        role: true,
        createdAt: true,
        email: true,
        settings: {
          select: {
            isPrivateProfile: true,
            showEmail: true,
            activityPublic: true,
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!targetUser) {
    notFound();
  }

  const isOwner = currentUser?.id === targetUser.id;
  const isPrivate = Boolean(targetUser.settings?.isPrivateProfile) && !isOwner;
  const canViewJoinedSpaces = isOwner || targetUser.settings?.activityPublic !== false;
  const canShowEmail = isOwner || (targetUser.settings?.showEmail && targetUser.email);

  const interests: string[] = (() => {
    try {
      return JSON.parse(targetUser.interests || '[]');
    } catch {
      return [];
    }
  })();

  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(
    targetUser.username
  )}`;

  // Formatted joined date
  const joinedDate = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(targetUser.createdAt));

  // 2. Fetch associated content strictly with server-side authorization
  const [drops, collections, createdMemberships, joinedMemberships] = await Promise.all([
    !isPrivate
      ? prisma.drop.findMany({
          where: { userId: targetUser.id },
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: {
            space: {
              select: {
                id: true,
                name: true,
                slug: true,
                themeColor: true,
              },
            },
            media: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                url: true,
                width: true,
                height: true,
                aspectRatio: true,
              },
            },
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        })
      : Promise.resolve([]),

    !isPrivate ? getUserCollections(targetUser.id) : Promise.resolve([]),

    !isPrivate
      ? prisma.spaceMember.findMany({
          where: {
            userId: targetUser.id,
            role: 'CREATOR',
          },
          include: {
            space: {
              include: {
                drops: {
                  take: 3,
                  orderBy: { createdAt: 'desc' },
                  include: {
                    media: {
                      take: 1,
                      orderBy: { sortOrder: 'asc' },
                      select: { url: true },
                    },
                  },
                },
              },
            },
          },
          take: 20,
        })
      : Promise.resolve([]),

    !isPrivate && canViewJoinedSpaces
      ? prisma.spaceMember.findMany({
          where: {
            userId: targetUser.id,
            role: { in: ['MEMBER', 'MODERATOR'] },
          },
          include: {
            space: {
              include: {
                drops: {
                  take: 3,
                  orderBy: { createdAt: 'desc' },
                  include: {
                    media: {
                      take: 1,
                      orderBy: { sortOrder: 'asc' },
                      select: { url: true },
                    },
                  },
                },
              },
            },
          },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const mappedDrops = drops.map((d) => ({
    ...d,
    parsedSpecs: undefined,
  }));

  const createdSpaces = createdMemberships.map((m) => m.space);
  const joinedSpaces = joinedMemberships.map((m) => m.space);

  const activeTab = tab;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-3xl glass border border-border/80 p-6 sm:p-8 shadow-xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <img
              src={targetUser.avatarUrl || defaultAvatar}
              alt={targetUser.displayName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-border/80 shadow-md shrink-0"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {targetUser.displayName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  <Shield className="w-3 h-3" />
                  <span>{targetUser.role}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/90">@{targetUser.username}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Tham gia {joinedDate}</span>
                </span>
                {canShowEmail && targetUser.email && (
                  <>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{targetUser.email}</span>
                    </span>
                  </>
                )}
              </div>

              {targetUser.bio && (
                <p className="text-xs sm:text-sm text-foreground/80 max-w-xl leading-relaxed pt-1 whitespace-pre-line">
                  {targetUser.bio}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons (Owner only) */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {isOwner ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/settings/profile"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border/80 bg-foreground text-background hover:opacity-90 transition-all active:scale-95 shadow-xs"
                >
                  <span>Chỉnh sửa hồ sơ</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground transition-all active:scale-95 shadow-xs"
                  title="Cài đặt tài khoản"
                  aria-label="Cài đặt tài khoản"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* Interests Tags */}
        {interests.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Chủ đề quan tâm:
            </span>
            {interests.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border/60"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Private Profile State */}
      {isPrivate ? (
        <div className="rounded-3xl border border-border/80 p-12 text-center bg-card/60 shadow-xs max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground mb-4 shadow-2xs">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-base font-bold text-foreground">Hồ sơ này ở chế độ riêng tư</h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Người dùng này đã đặt quyền riêng tư cho các tác phẩm và hoạt động của mình trên Spaces.
          </p>
        </div>
      ) : (
        <>
          {/* Meaningful Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <Link
              href={`/u/${targetUser.username}?tab=drops`}
              className={`p-4 rounded-2xl border transition-all text-center ${
                activeTab === 'drops'
                  ? 'bg-secondary/90 border-foreground/30 shadow-xs'
                  : 'bg-card border-border/70 hover:border-border'
              }`}
            >
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {mappedDrops.length}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Tác phẩm</span>
              </div>
            </Link>

            <Link
              href={`/u/${targetUser.username}?tab=collections`}
              className={`p-4 rounded-2xl border transition-all text-center ${
                activeTab === 'collections'
                  ? 'bg-secondary/90 border-foreground/30 shadow-xs'
                  : 'bg-card border-border/70 hover:border-border'
              }`}
            >
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {collections.length}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
                <FolderHeart className="w-3 h-3 text-indigo-500" />
                <span>Bộ sưu tập</span>
              </div>
            </Link>

            <Link
              href={`/u/${targetUser.username}?tab=created`}
              className={`p-4 rounded-2xl border transition-all text-center ${
                activeTab === 'created'
                  ? 'bg-secondary/90 border-foreground/30 shadow-xs'
                  : 'bg-card border-border/70 hover:border-border'
              }`}
            >
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {createdSpaces.length}
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
                <Compass className="w-3 h-3 text-amber-500" />
                <span>Không gian tạo</span>
              </div>
            </Link>

            {canViewJoinedSpaces ? (
              <Link
                href={`/u/${targetUser.username}?tab=joined`}
                className={`p-4 rounded-2xl border transition-all text-center ${
                  activeTab === 'joined'
                    ? 'bg-secondary/90 border-foreground/30 shadow-xs'
                    : 'bg-card border-border/70 hover:border-border'
                }`}
              >
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {joinedSpaces.length}
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
                  <UserCheck className="w-3 h-3 text-sky-500" />
                  <span>Tham gia</span>
                </div>
              </Link>
            ) : (
              <div className="p-4 rounded-2xl border border-border/40 bg-card/40 text-center opacity-60">
                <div className="text-xl sm:text-2xl font-black text-muted-foreground">
                  —
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Riêng tư</span>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation Navigation Capsule */}
          <div className="flex items-center gap-2 border-b border-border/70 pb-4 mb-6 overflow-x-auto scrollbar-none">
            <Link
              href={`/u/${targetUser.username}?tab=drops`}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'drops'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Tác phẩm ({mappedDrops.length})
            </Link>

            <Link
              href={`/u/${targetUser.username}?tab=collections`}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'collections'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Bộ sưu tập ({collections.length})
            </Link>

            <Link
              href={`/u/${targetUser.username}?tab=created`}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'created'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Không gian đã tạo ({createdSpaces.length})
            </Link>

            {canViewJoinedSpaces && (
              <Link
                href={`/u/${targetUser.username}?tab=joined`}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'joined'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Không gian tham gia ({joinedSpaces.length})
              </Link>
            )}
          </div>

          {/* Tab Content: Drops */}
          {activeTab === 'drops' && (
            <div>
              {mappedDrops.length === 0 ? (
                <div className="rounded-2xl border border-border/60 p-12 text-center bg-card/50">
                  <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground mb-3">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Chưa có tác phẩm nào</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {isOwner
                      ? 'Bạn chưa đăng tác phẩm nào. Hãy chia sẻ góc nhìn thẩm mỹ đầu tiên của bạn!'
                      : `${targetUser.displayName} chưa đăng tải tác phẩm nào trên Spaces.`}
                  </p>
                  {isOwner && (
                    <Link
                      href="/create"
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tạo tác phẩm mới</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
                  {mappedDrops.map((drop) => (
                    <DropCard key={drop.id} drop={drop} showSpaceBadge />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Collections */}
          {activeTab === 'collections' && (
            <div>
              {collections.length === 0 ? (
                <div className="rounded-2xl border border-border/60 p-12 text-center bg-card/50">
                  <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground mb-3">
                    <FolderHeart className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Chưa có bộ sưu tập nào</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {isOwner
                      ? 'Bạn chưa tạo bộ sưu tập nào. Hãy lưu các tác phẩm yêu thích để nhóm lại.'
                      : `${targetUser.displayName} chưa có bộ sưu tập công khai nào.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {collections.map((col) => (
                    <CollectionCard key={col.id} collection={col} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Created Spaces */}
          {activeTab === 'created' && (
            <div>
              {createdSpaces.length === 0 ? (
                <div className="rounded-2xl border border-border/60 p-12 text-center bg-card/50">
                  <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground mb-3">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Chưa có Không gian nào</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {isOwner
                      ? 'Bạn chưa khởi tạo Không gian nào. Hãy tạo một Không gian riêng cho chủ đề của bạn!'
                      : `${targetUser.displayName} chưa khởi tạo Không gian nào.`}
                  </p>
                  {isOwner && (
                    <Link
                      href="/s/new"
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Khởi tạo Không gian</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {createdSpaces.map((space) => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Joined Spaces */}
          {activeTab === 'joined' && canViewJoinedSpaces && (
            <div>
              {joinedSpaces.length === 0 ? (
                <div className="rounded-2xl border border-border/60 p-12 text-center bg-card/50">
                  <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground mb-3">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Chưa tham gia Không gian nào</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {isOwner
                      ? 'Bạn chưa tham gia Không gian nào. Hãy khám phá và tham gia các cộng đồng sáng tạo!'
                      : `${targetUser.displayName} chưa tham gia Không gian nào.`}
                  </p>
                  {isOwner && (
                    <Link
                      href="/explore"
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Khám phá cộng đồng</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {joinedSpaces.map((space) => (
                    <SpaceCard key={space.id} space={space} initialJoined />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
