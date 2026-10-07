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
    .min(1, 'Nội dung bình luận không được để trống')
    .max(1000, 'Nội dung bình luận tối đa 1000 ký tự'),
  spaceId: z.string().uuid().nullable().optional(),
  dropId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const CommentReactionInputSchema = z.object({
  commentId: z.string().uuid('ID bình luận không hợp lệ'),
  type: z.enum(['HEART', 'INSPIRED', 'FIRE', 'LIKE']).default('HEART'),
});

export const CommentEditInputSchema = z.object({
  commentId: z.string().uuid('ID bình luận không hợp lệ'),
  content: z
    .string()
    .trim()
    .min(1, 'Nội dung chỉnh sửa không được để trống')
    .max(1000, 'Nội dung chỉnh sửa tối đa 1000 ký tự'),
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

export const ProfileInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(60, 'Tên hiển thị tối đa 60 ký tự'),
  username: z
    .string()
    .trim()
    .min(3, 'Tên người dùng tối thiểu 3 ký tự')
    .max(30, 'Tên người dùng tối đa 30 ký tự')
    .regex(/^[a-z0-9_]+$/, 'Tên người dùng chỉ gồm chữ thường, số và dấu gạch dưới'),
  bio: z.string().trim().max(300, 'Tiểu sử tối đa 300 ký tự').optional().nullable(),
  interests: z.array(z.string().trim().max(40)).max(15, 'Tối đa 15 sở thích').optional(),
  avatarUrl: z.string().refine(isSafeUrl, 'URL ảnh đại diện không hợp lệ').optional().nullable(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự').max(128),
  confirmPassword: z.string().min(8, 'Xác nhận mật khẩu tối thiểu 8 ký tự').max(128),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không trùng khớp',
  path: ['confirmPassword'],
});

export const EmailChangeSchema = z.object({
  newEmail: z.string().email('Địa chỉ email mới không hợp lệ').max(100),
  currentPassword: z.string().optional(),
});

export const PrivacySettingsSchema = z.object({
  isPrivateProfile: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  activityPublic: z.boolean().optional(),
});

export const NotificationSettingsSchema = z.object({
  notifyComments: z.boolean().optional(),
  notifyReplies: z.boolean().optional(),
  notifyReactions: z.boolean().optional(),
  notifyCuratorPick: z.boolean().optional(),
});

export const PreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system'], {
    message: 'Giao diện phải là light, dark hoặc system',
  }),
  reducedMotion: z.boolean().optional(),
});

