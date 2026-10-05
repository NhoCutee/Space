'use client';

import { useState, useEffect } from 'react';

interface RelativeTimeProps {
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  className?: string;
  showBothIfEdited?: boolean;
}

/**
 * Format relative time safely using local client time.
 */
export function formatRelativeTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSeconds < 15) {
    return 'just now';
  }
  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) {
    return '1 minute ago';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) {
    return '1 hour ago';
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Reusable RelativeTime component that auto-updates live while page is open.
 * Uses createdAt as source of truth and updatedAt for edit state.
 * Displays local timezone datetime on hover.
 */
export function RelativeTime({
  createdAt,
  updatedAt,
  className = '',
  showBothIfEdited = false,
}: RelativeTimeProps) {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);

    const calcInterval = () => {
      const createdTime = new Date(createdAt).getTime();
      const diffSec = Math.floor((Date.now() - createdTime) / 1000);
      if (diffSec < 60) return 5000; // 5s for fast updates
      if (diffSec < 3600) return 20000; // 20s
      return 60000; // 1m
    };

    const intervalId = setInterval(() => {
      setTick((t) => t + 1);
    }, calcInterval());

    return () => clearInterval(intervalId);
  }, [createdAt]);

  const createdDate = new Date(createdAt);
  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const isEdited =
    updatedDate && updatedDate.getTime() - createdDate.getTime() > 2000;

  // Static fallback for SSR
  if (!mounted) {
    return (
      <span className={className} suppressHydrationWarning>
        {isEdited
          ? `Edited ${formatRelativeTime(updatedDate!)}`
          : formatRelativeTime(createdDate)}
      </span>
    );
  }

  const localCreatedString = createdDate.toLocaleString();
  const localUpdatedString = updatedDate ? updatedDate.toLocaleString() : '';

  const tooltip = isEdited
    ? `Created: ${localCreatedString}\nEdited: ${localUpdatedString}`
    : `Created: ${localCreatedString}`;

  if (isEdited) {
    if (showBothIfEdited) {
      return (
        <span className={className} title={tooltip}>
          <span>{formatRelativeTime(createdDate)}</span>
          <span className="italic ml-1 opacity-80">
            • Edited {formatRelativeTime(updatedDate!)}
          </span>
        </span>
      );
    }

    return (
      <span className={className} title={tooltip}>
        Edited {formatRelativeTime(updatedDate!)}
      </span>
    );
  }

  return (
    <span className={className} title={tooltip}>
      {formatRelativeTime(createdDate)}
    </span>
  );
}
