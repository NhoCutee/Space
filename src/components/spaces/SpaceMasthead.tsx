'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Sparkles, BookOpen, Share2, Check, Shield } from 'lucide-react';
import { JoinButton } from './JoinButton';
import { toast } from 'sonner';

interface SpaceMastheadProps {
  space: {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: string;
    coverImageUrl: string;
    themeColor: string;
    guidelines: string | null;
    membersCount: number;
    dropsCount: number;
    members?: Array<{
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
    }>;
  };
  initialJoined: boolean;
  userRole?: string | null;
}

export function SpaceMasthead({ space, initialJoined, userRole }: SpaceMastheadProps) {
  const [membersCount, setMembersCount] = useState(space.membersCount);
  const [isJoined, setIsJoined] = useState(initialJoined);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Space link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-border/80 bg-card mb-4 sm:mb-8 shadow-xs">
      {/* Cover Image & Atmospheric Gradient */}
      <div className="relative w-full h-36 sm:h-72 md:h-80 overflow-hidden bg-muted">
        <img
          src={space.coverImageUrl}
          alt={space.name}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div
          className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
          style={{ backgroundColor: space.themeColor || '#18181b' }}
        />

        {/* Top Badges */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between">
          <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-background/80 backdrop-blur-md text-foreground border border-border/60">
            {space.category}
          </span>

          <button
            onClick={handleShare}
            className="p-1.5 sm:p-2 rounded-full bg-background/80 backdrop-blur-md text-foreground border border-border/60 hover:bg-background transition-colors active:scale-95 cursor-pointer"
            title="Share Space"
            aria-label="Share Space"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            ) : (
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Space Details & Actions */}
      <div className="relative px-4 py-4 sm:px-8 sm:py-6 -mt-8 sm:-mt-16 z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2.5 mb-1.5 sm:mb-2">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {space.name}
            </h1>
            {userRole && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Shield className="w-3 h-3" />
                <span>{userRole}</span>
              </span>
            )}
          </div>

          <p className="text-xs sm:text-base text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
            {space.description}
          </p>

          {/* Member Avatars & Stats */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
              <span>{membersCount} members</span>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              <span>{space.dropsCount} drops</span>
            </div>

            {space.guidelines && (
              <button
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guidelines</span>
              </button>
            )}

            {/* Member avatar strip */}
            {space.members && space.members.length > 0 && (
              <div className="flex items-center -space-x-2 overflow-hidden ml-1">
                {space.members.slice(0, 4).map((m, i) => (
                  <Link
                    key={i}
                    href={`/u/${encodeURIComponent(m.user.username)}`}
                    title={`${m.user.displayName} (@${m.user.username})`}
                    aria-label={`Hồ sơ của ${m.user.displayName}`}
                    className="inline-block transition-transform hover:scale-110 hover:z-20 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                  >
                    <img
                      src={m.user.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(m.user.username)}`}
                      alt={m.user.displayName}
                      className="inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full ring-2 ring-background object-cover"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-1 sm:pt-0">
          <Link
            href={`/create?space=${space.slug}`}
            className="flex-1 sm:flex-none justify-center px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Drop</span>
          </Link>

          <JoinButton
            spaceId={space.id}
            initialJoined={isJoined}
            spaceName={space.name}
            size="lg"
            showCount
            initialCount={membersCount}
            onCountChange={(newCount, joinedState) => {
              setMembersCount(newCount);
              setIsJoined(joinedState);
            }}
          />
        </div>
      </div>

      {/* Guidelines Accordion Drawer */}
      {showGuidelines && space.guidelines && (
        <div className="px-6 pb-6 sm:px-8 border-t border-border/60 pt-4 mt-2 bg-secondary/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Space Guidelines & Ethos
            </span>
            <button
              onClick={() => setShowGuidelines(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {space.guidelines}
          </p>
        </div>
      )}
    </div>
  );
}
