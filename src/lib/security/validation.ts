import { z } from 'zod';

/**
 * Validates that a user-supplied URL uses strictly safe protocols (http: or https:)
 * and prevents dangerous schemes such as javascript:, data:, file:, vbscript:.
 */
export function isSafeUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;

  const trimmed = urlStr.trim();
  if (trimmed.startsWith('//')) return false; // Prevent protocol-relative URLs to external hosts

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    // Relative path check (e.g. /explore, /s/hanoi-coffee)
    return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\');
  }
}

/**
 * Validates and normalizes redirect destinations to prevent Open Redirect attacks.
 */
export function getSafeRedirectUrl(targetUrl: string | null | undefined, fallback = '/'): string {
  if (!targetUrl || typeof targetUrl !== 'string') return fallback;

  const trimmed = targetUrl.trim();

  // Safe relative paths only (e.g. /explore, /s/slug)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }

  // If absolute, must strictly match application origin
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const appOrigin = new URL(appUrl).origin;
    const targetOrigin = new URL(trimmed).origin;

    if (appOrigin === targetOrigin) {
      return trimmed;
    }
  } catch {}

  return fallback;
}

// -------------------------------------------------------------
// Boundary Validation Schemas
// -------------------------------------------------------------

export const RegisterInputSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(60, 'Display name cannot exceed 60 characters'),
  email: z.string().email('Please enter a valid email address').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  bio: z.string().max(300).optional(),
});

export const LoginInputSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required').max(100),
  password: z.string().min(1, 'Password is required').max(128),
});

export const CommentInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters'),
  spaceId: z.string().uuid().nullable().optional(),
  dropId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const SpaceInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(500),
  category: z.string().trim().min(2, 'Category is required').max(50),
  coverImageUrl: z.string().refine(isSafeUrl, 'Cover image URL must be a valid HTTP/HTTPS URL'),
  slug: z.string().max(60).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Theme color must be a valid hex color').optional(),
  guidelines: z.string().max(1000).optional(),
});

export const CollectionInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  description: z.string().trim().max(500).nullable().optional(),
  isPrivate: z.boolean().optional(),
});
