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
    <div className="relative w-full rounded-3xl overflow-hidden border border-border/80 bg-card mb-8 shadow-sm">
      {/* Cover Image & Atmospheric Gradient */}
      <div className="relative w-full h-56 sm:h-72 md:h-80 overflow-hidden bg-muted">
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
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-background/80 backdrop-blur-md text-foreground border border-border/60">
            {space.category}
          </span>

          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-background/80 backdrop-blur-md text-foreground border border-border/60 hover:bg-background transition-colors"
            title="Share Space"
            aria-label="Share Space"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Space Details & Actions */}
      <div className="relative px-6 py-6 sm:px-8 -mt-12 sm:-mt-16 z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {space.name}
            </h1>
            {userRole && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Shield className="w-3 h-3" />
                <span>{userRole}</span>
              </span>
            )}
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {space.description}
          </p>

          {/* Member Avatars & Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>{membersCount} members</span>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" />
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
                  <img
                    key={i}
                    src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=user'}
                    alt={m.user.displayName}
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-background object-cover"
                    title={m.user.displayName}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href={`/drop/new?space=${space.slug}`}
            className="px-4 py-2.5 rounded-full text-sm font-semibold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
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
