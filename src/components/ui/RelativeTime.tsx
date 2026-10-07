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
export function formatRelativeTime(dateInput: Date | string, locale: 'vi' | 'en' = 'vi'): string {
  const date = new Date(dateInput);
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (locale === 'vi') {
    if (diffSeconds < 15) return 'vừa xong';
    if (diffSeconds < 60) return `${diffSeconds} giây trước`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }

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
  locale = 'vi',
}: RelativeTimeProps & { locale?: 'vi' | 'en' }) {
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

  const editedPrefix = locale === 'vi' ? 'Đã chỉnh sửa' : 'Edited';
  const createdLabel = locale === 'vi' ? 'Đã tạo' : 'Created';

  // Static fallback for SSR
  if (!mounted) {
    return (
      <span className={className} suppressHydrationWarning>
        {isEdited
          ? `${editedPrefix} ${formatRelativeTime(updatedDate!, locale)}`
          : formatRelativeTime(createdDate, locale)}
      </span>
    );
  }

  const localCreatedString = createdDate.toLocaleString(locale === 'vi' ? 'vi-VN' : undefined);
  const localUpdatedString = updatedDate ? updatedDate.toLocaleString(locale === 'vi' ? 'vi-VN' : undefined) : '';

  const tooltip = isEdited
    ? `${createdLabel}: ${localCreatedString}\n${editedPrefix}: ${localUpdatedString}`
    : `${createdLabel}: ${localCreatedString}`;

  if (isEdited) {
    if (showBothIfEdited) {
      return (
        <span className={className} title={tooltip}>
          <span>{formatRelativeTime(createdDate, locale)}</span>
          <span className="italic ml-1 opacity-80">
            • {editedPrefix} {formatRelativeTime(updatedDate!, locale)}
          </span>
        </span>
      );
    }

    return (
      <span className={className} title={tooltip}>
        {editedPrefix} {formatRelativeTime(updatedDate!, locale)}
      </span>
    );
  }

  return (
    <span className={className} title={tooltip}>
      {formatRelativeTime(createdDate, locale)}
    </span>
  );
}
