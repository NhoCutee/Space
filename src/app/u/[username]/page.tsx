import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  Sparkles,
  ArrowLeft,
  Settings,
  Layers,
  Shield,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

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

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [targetUser, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      include: {
        drops: {
          include: {
            space: true,
            media: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        memberships: {
          include: {
            space: true,
          },
          take: 8,
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!targetUser) {
    notFound();
  }

  const isOwner = currentUser?.id === targetUser.id;
  const interests: string[] = JSON.parse(targetUser.interests || '[]');
  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(targetUser.username)}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
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
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-border/80 shadow-md"
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
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                @{targetUser.username}
              </div>
              {targetUser.bio && (
                <p className="text-xs sm:text-sm text-foreground/80 max-w-xl leading-relaxed pt-1">
                  {targetUser.bio}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {isOwner && (
              <Link
                href="/settings"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground transition-all active:scale-95 shadow-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Cài đặt tài khoản</span>
              </Link>
            )}
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

      {/* User's Drops */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h2 className="text-lg font-bold text-foreground">
              Tác phẩm đã chia sẻ ({targetUser.drops.length})
            </h2>
          </div>
        </div>

        {targetUser.drops.length === 0 ? (
          <div className="rounded-2xl border border-border/60 p-12 text-center bg-card/50">
            <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Chưa có tác phẩm nào</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {isOwner
                ? 'Bạn chưa tạo tác phẩm nào. Hãy chia sẻ góc nhìn thẩm mỹ đầu tiên của bạn!'
                : `${targetUser.displayName} chưa đăng tải tác phẩm nào trên Spaces.`}
            </p>
            {isOwner && (
              <Link
                href="/create"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <span>Tạo tác phẩm mới</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {targetUser.drops.map((drop) => {
              const coverMedia = drop.media[0];
              return (
                <Link
                  key={drop.id}
                  href={`/drop/${drop.id}`}
                  className="group rounded-2xl border border-border/70 overflow-hidden bg-card hover:border-border transition-all hover:shadow-lg flex flex-col"
                >
                  <div className="aspect-4/3 w-full bg-secondary/80 relative overflow-hidden">
                    {coverMedia ? (
                      <img
                        src={coverMedia.url}
                        alt={drop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Sparkles className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    {drop.space && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-background/80 backdrop-blur-md text-foreground border border-border/60">
                        {drop.space.name}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {drop.title}
                      </h3>
                      {drop.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {drop.content}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
