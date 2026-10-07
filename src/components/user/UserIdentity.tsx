'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export interface UserIdentityProps {
  user: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    role?: string | null;
  };
  variant?: 'full' | 'compact' | 'comment';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  timestamp?: Date | string | null;
  link?: boolean;
  showUsername?: boolean;
  showRoleBadge?: boolean;
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function UserIdentity({
  user,
  variant = 'compact',
  size = 'sm',
  timestamp,
  link = true,
  showUsername,
  showRoleBadge = false,
  className = '',
  avatarClassName = '',
  textClassName = '',
  onClick,
}: UserIdentityProps) {
  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(
    user?.username || 'user'
  )}`;
  const [imgSrc, setImgSrc] = useState<string>(user?.avatarUrl || defaultAvatar);
  const [hasError, setHasError] = useState(false);

  // If user prop is unexpectedly undefined, render graceful fallback
  if (!user || !user.username) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <span className="w-5 h-5 rounded-full bg-muted inline-block" />
        <span>Thành viên</span>
      </span>
    );
  }

  const shouldShowUsername = showUsername !== undefined ? showUsername : variant === 'full';

  // Sizing definitions
  const avatarSizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  const nameSizeClasses = {
    xs: 'text-xs font-semibold',
    sm: 'text-xs font-bold',
    md: 'text-sm font-bold',
    lg: 'text-base font-bold',
  }[size];

  const usernameSizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm',
  }[size];

  const formattedTime = timestamp ? timeAgo(timestamp) : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    }
  };

  const avatarElement = (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden ring-1 ring-border/80 bg-muted/60 ${avatarSizeClasses} ${avatarClassName}`}
    >
      <img
        src={hasError ? defaultAvatar : imgSrc}
        alt={user.displayName || user.username}
        loading="lazy"
        onError={() => {
          if (!hasError) {
            setHasError(true);
            setImgSrc(defaultAvatar);
          }
        }}
        className="w-full h-full object-cover"
      />
    </div>
  );

  const roleBadgeElement = showRoleBadge && user.role && (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0"
      title={`Vai trò: ${user.role}`}
    >
      <Shield className="w-2.5 h-2.5" />
      <span>{user.role}</span>
    </span>
  );

  let content: React.ReactNode = null;

  if (variant === 'full') {
    content = (
      <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
        {avatarElement}
        <div className={`min-w-0 flex flex-col justify-center leading-tight ${textClassName}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`${nameSizeClasses} text-foreground truncate group-hover/user:text-primary transition-colors`}>
              {user.displayName}
            </span>
            {roleBadgeElement}
          </div>
          {shouldShowUsername && (
            <span className={`${usernameSizeClasses} text-muted-foreground truncate`}>
              @{user.username}
            </span>
          )}
        </div>
      </div>
    );
  } else if (variant === 'comment') {
    content = (
      <div className={`flex items-center gap-2 min-w-0 ${className}`}>
        {avatarElement}
        <div className={`flex items-center gap-1.5 min-w-0 flex-wrap ${textClassName}`}>
          <span className={`${nameSizeClasses} text-foreground truncate group-hover/user:text-primary transition-colors`}>
            {user.displayName}
          </span>
          {shouldShowUsername && (
            <span className={`${usernameSizeClasses} text-muted-foreground truncate`}>
              @{user.username}
            </span>
          )}
          {formattedTime && (
            <>
              <span className="text-muted-foreground text-[10px]">•</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{formattedTime}</span>
            </>
          )}
        </div>
      </div>
    );
  } else {
    // variant === 'compact'
    content = (
      <div className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
        {avatarElement}
        <div className={`flex items-center gap-1.5 min-w-0 ${textClassName}`}>
          <span className={`${nameSizeClasses} text-foreground truncate group-hover/user:text-primary transition-colors`}>
            {user.displayName}
          </span>
          {shouldShowUsername && (
            <span className={`${usernameSizeClasses} text-muted-foreground truncate`}>
              @{user.username}
            </span>
          )}
          {roleBadgeElement}
        </div>
      </div>
    );
  }

  if (!link) {
    return <div className="inline-flex min-w-0">{content}</div>;
  }

  return (
    <Link
      href={`/u/${encodeURIComponent(user.username)}`}
      onClick={handleClick}
      aria-label={`Hồ sơ của ${user.displayName} (@${user.username})`}
      className="group/user inline-flex min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg transition-opacity hover:opacity-95"
    >
      {content}
    </Link>
  );
}
