'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  getCurrentUser,
  clearCurrentUser,
  verifyPassword,
  hashPassword,
  validatePasswordPolicy,
  revokeSession,
  hashToken,
  COOKIE_REFRESH_TOKEN,
  OAuthProvider,
} from '@/lib/auth';
import {
  ProfileInputSchema,
  ChangePasswordSchema,
  EmailChangeSchema,
  PrivacySettingsSchema,
  NotificationSettingsSchema,
  PreferencesSchema,
} from '@/lib/security/validation';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/security/rateLimit';

// =========================================================================
// 1. PROFILE SETTINGS & AVATAR UPLOAD
// =========================================================================

export async function uploadAvatarAction(formData: FormData): Promise<{
  success: boolean;
  avatarUrl?: string;
  error?: string;
}> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Bạn cần đăng nhập để tải ảnh đại diện.' };
  }

  // Rate limit avatar upload
  const rateLimit = await checkRateLimit(`avatar:${currentUser.id}`, RATE_LIMIT_PRESETS.UPLOAD);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return { success: false, error: `Tải ảnh quá nhanh. Vui lòng thử lại sau ${retryAfter} giây.` };
  }

  const file = formData.get('avatar') as File | null;
  if (!file) {
    return { success: false, error: 'Vui lòng chọn tệp hình ảnh để tải lên.' };
  }

  // Validate file size (max 8MB)
  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: 'Dung lượng ảnh tối đa là 8MB.' };
  }

  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowedTypes.has(file.type)) {
    return { success: false, error: 'Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WebP hoặc GIF.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Dynamic import sharp
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(inputBuffer).metadata();

    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif', 'avif'].includes(metadata.format)) {
      return { success: false, error: 'Tệp tải lên không phải là định dạng hình ảnh hợp lệ.' };
    }

    // High quality center-crop to square 400x400 WebP
    const processedBuffer = await sharp(inputBuffer)
      .rotate() // Auto-orient based on EXIF
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toBuffer();

    const { uploadAvatarImage } = await import('@/lib/media/cloudinary');
    const avatarUrl = await uploadAvatarImage(currentUser.id, processedBuffer);

    // Save directly to user record
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { avatarUrl },
    });

    try {
      revalidatePath('/settings/profile');
      revalidatePath('/settings');
      revalidatePath(`/u/${currentUser.username}`);
      revalidatePath('/');
    } catch {}

    return { success: true, avatarUrl };
  } catch (err: unknown) {
    console.error('[UploadAvatar] Error:', err);
    return { success: false, error: 'Có lỗi xảy ra khi xử lý và lưu ảnh đại diện.' };
  }
}

export async function updateProfileAction(data: {
  displayName: string;
  username: string;
  bio?: string | null;
  interests?: string[];
  avatarUrl?: string | null;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Bạn cần đăng nhập để cập nhật hồ sơ.' };
  }

  const validated = ProfileInputSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' };
  }

  const cleanUsername = validated.data.username.toLowerCase();

  // If changing username, check uniqueness
  if (cleanUsername !== currentUser.username) {
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing && existing.id !== currentUser.id) {
      return { success: false, error: 'Tên người dùng này đã được sử dụng.' };
    }
  }

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      displayName: validated.data.displayName,
      username: cleanUsername,
      bio: validated.data.bio ?? null,
      interests: JSON.stringify(validated.data.interests ?? []),
      avatarUrl: validated.data.avatarUrl ?? null,
    },
  });

  try {
    revalidatePath('/settings/profile');
    revalidatePath(`/u/${cleanUsername}`);
    revalidatePath(`/u/${currentUser.username}`);
    revalidatePath('/');
  } catch {}

  return {
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      interests: JSON.parse(updated.interests || '[]'),
      role: updated.role,
    },
  };
}

// =========================================================================
// 2. ACCOUNT SETTINGS & EMAIL CHANGE
// =========================================================================

export async function changeEmailAction(newEmail: string, currentPassword?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  // Rate limit email changes
  const rateLimit = await checkRateLimit(`settings:email:${currentUser.id}`, RATE_LIMIT_PRESETS.AUTH);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return { success: false, error: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.` };
  }

  const validation = EmailChangeSchema.safeParse({ newEmail, currentPassword });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || 'Email không hợp lệ.' };
  }

  const cleanEmail = validation.data.newEmail.trim().toLowerCase();

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });
  if (!dbUser) return { success: false, error: 'Người dùng không tồn tại.' };

  if (dbUser.email === cleanEmail) {
    return { success: false, error: 'Email mới trùng với email hiện tại.' };
  }

  // If user has a password set, require current password verification
  if (dbUser.passwordHash) {
    if (!currentPassword) {
      return { success: false, error: 'Vui lòng nhập mật khẩu hiện tại để xác nhận đổi email.' };
    }
    const isPasswordValid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
    }
  }

  // Check email uniqueness
  const existingEmail = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });
  if (existingEmail && existingEmail.id !== currentUser.id) {
    return { success: false, error: 'Email này đã được sử dụng bởi tài khoản khác.' };
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { email: cleanEmail },
  });

  try {
    revalidatePath('/settings/account');
  } catch {}

  return { success: true, email: cleanEmail };
}

// =========================================================================
// 3. SECURITY & PASSWORD
// =========================================================================

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  // Rate limit password changes
  const rateLimit = await checkRateLimit(`settings:password:${currentUser.id}`, RATE_LIMIT_PRESETS.AUTH);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return { success: false, error: `Quá nhiều lần thử. Vui lòng thử lại sau ${retryAfter} giây.` };
  }

  const validation = ChangePasswordSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' };
  }

  const policy = validatePasswordPolicy(validation.data.newPassword);
  if (!policy.valid) {
    return { success: false, error: policy.error || 'Mật khẩu mới không đáp ứng chính sách bảo mật.' };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });
  if (!dbUser) return { success: false, error: 'Người dùng không tồn tại.' };

  // If user already has a password, verify it
  if (dbUser.passwordHash) {
    const isCorrect = await verifyPassword(validation.data.currentPassword, dbUser.passwordHash);
    if (!isCorrect) {
      return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
    }
  }

  const newHash = await hashPassword(validation.data.newPassword);

  await prisma.user.update({
    where: { id: currentUser.id },
    data: { passwordHash: newHash },
  });

  // Revoke all other active sessions for security (Session Revocation Policy)
  let currentSessionId: string | null = null;
  try {
    const cookieStore = await cookies();
    const rawRefresh = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
    if (rawRefresh) {
      const hashed = hashToken(rawRefresh);
      const currSession = await prisma.session.findUnique({
        where: { hashedRefreshToken: hashed },
      });
      if (currSession) {
        currentSessionId = currSession.id;
      }
    }
  } catch {}

  await prisma.session.updateMany({
    where: {
      userId: currentUser.id,
      revokedAt: null,
      id: currentSessionId ? { not: currentSessionId } : undefined,
    },
    data: { revokedAt: new Date() },
  });

  try {
    revalidatePath('/settings/security');
    revalidatePath('/settings/sessions');
  } catch {}

  return { success: true };
}

// =========================================================================
// 4. SESSIONS MANAGEMENT
// =========================================================================

export async function getActiveSessionsAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  let currentHashedToken: string | null = null;
  try {
    const cookieStore = await cookies();
    const rawRefresh = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
    if (rawRefresh) {
      currentHashedToken = hashToken(rawRefresh);
    }
  } catch {}

  const sessions = await prisma.session.findMany({
    where: {
      userId: currentUser.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastUsedAt: 'desc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    expiresAt: s.expiresAt,
    isCurrent: currentHashedToken ? s.hashedRefreshToken === currentHashedToken : false,
  }));
}

export async function revokeSessionAction(sessionId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  const targetSession = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!targetSession || targetSession.userId !== currentUser.id) {
    return { success: false, error: 'Phiên đăng nhập không tồn tại hoặc không thuộc quyền sở hữu.' };
  }

  await revokeSession(sessionId);

  // If revoking current session, clear auth cookies
  try {
    const cookieStore = await cookies();
    const rawRefresh = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
    if (rawRefresh && hashToken(rawRefresh) === targetSession.hashedRefreshToken) {
      await clearCurrentUser();
    }
  } catch {}

  try {
    revalidatePath('/settings/sessions');
  } catch {}

  return { success: true };
}

export async function revokeAllOtherSessionsAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  let currentSessionId: string | null = null;
  try {
    const cookieStore = await cookies();
    const rawRefresh = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
    if (rawRefresh) {
      const hashed = hashToken(rawRefresh);
      const curr = await prisma.session.findUnique({
        where: { hashedRefreshToken: hashed },
      });
      if (curr) currentSessionId = curr.id;
    }
  } catch {}

  await prisma.session.updateMany({
    where: {
      userId: currentUser.id,
      revokedAt: null,
      id: currentSessionId ? { not: currentSessionId } : undefined,
    },
    data: { revokedAt: new Date() },
  });

  try {
    revalidatePath('/settings/sessions');
  } catch {}

  return { success: true };
}

// =========================================================================
// 5. CONNECTIONS (OAUTH PROVIDERS)
// =========================================================================

export async function getConnectedAccountsAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { accounts: [], hasPassword: false };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: { accounts: true },
  });

  return {
    accounts: (dbUser?.accounts || []).map((a) => ({
      provider: a.provider as OAuthProvider,
      createdAt: a.createdAt,
    })),
    hasPassword: Boolean(dbUser?.passwordHash),
  };
}

export async function disconnectProviderAction(provider: OAuthProvider) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: { accounts: true },
  });
  if (!dbUser) return { success: false, error: 'Người dùng không tồn tại.' };

  const hasPassword = Boolean(dbUser.passwordHash);
  const otherProviders = dbUser.accounts.filter((a) => a.provider !== provider);

  // Security Rule: Do not allow removing final login method
  if (!hasPassword && otherProviders.length === 0) {
    return {
      success: false,
      error: 'Không thể hủy liên kết. Đây là phương thức đăng nhập duy nhất vào tài khoản của bạn. Vui lòng đặt mật khẩu trước khi ngắt kết nối.',
    };
  }

  await prisma.account.deleteMany({
    where: {
      userId: currentUser.id,
      provider,
    },
  });

  try {
    revalidatePath('/settings/connections');
  } catch {}

  return { success: true };
}

// =========================================================================
// 6. PRIVACY SETTINGS
// =========================================================================

export async function getPrivacySettingsAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const settings = await prisma.userSettings.upsert({
    where: { userId: currentUser.id },
    create: { userId: currentUser.id },
    update: {},
  });

  return {
    isPrivateProfile: settings.isPrivateProfile,
    showEmail: settings.showEmail,
    activityPublic: settings.activityPublic,
  };
}

export async function updatePrivacySettingsAction(data: {
  isPrivateProfile?: boolean;
  showEmail?: boolean;
  activityPublic?: boolean;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  const validation = PrivacySettingsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Dữ liệu không hợp lệ.' };
  }

  await prisma.userSettings.upsert({
    where: { userId: currentUser.id },
    create: {
      userId: currentUser.id,
      ...validation.data,
    },
    update: {
      ...validation.data,
    },
  });

  try {
    revalidatePath('/settings/privacy');
    revalidatePath(`/u/${currentUser.username}`);
  } catch {}

  return { success: true };
}

// =========================================================================
// 7. NOTIFICATION SETTINGS
// =========================================================================

export async function getNotificationSettingsAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const settings = await prisma.userSettings.upsert({
    where: { userId: currentUser.id },
    create: { userId: currentUser.id },
    update: {},
  });

  return {
    notifyComments: settings.notifyComments,
    notifyReplies: settings.notifyReplies,
    notifyReactions: settings.notifyReactions,
    notifyCuratorPick: settings.notifyCuratorPick,
  };
}

export async function updateNotificationSettingsAction(data: {
  notifyComments?: boolean;
  notifyReplies?: boolean;
  notifyReactions?: boolean;
  notifyCuratorPick?: boolean;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  const validation = NotificationSettingsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Dữ liệu không hợp lệ.' };
  }

  await prisma.userSettings.upsert({
    where: { userId: currentUser.id },
    create: {
      userId: currentUser.id,
      ...validation.data,
    },
    update: {
      ...validation.data,
    },
  });

  try {
    revalidatePath('/settings/notifications');
  } catch {}

  return { success: true };
}

// =========================================================================
// 8. PREFERENCES (APPEARANCE & APP)
// =========================================================================

export async function getPreferencesAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const settings = await prisma.userSettings.upsert({
    where: { userId: currentUser.id },
    create: { userId: currentUser.id },
    update: {},
  });

  return {
    theme: settings.theme as 'light' | 'dark' | 'system',
    reducedMotion: settings.reducedMotion,
  };
}

export async function updatePreferencesAction(data: {
  theme: 'light' | 'dark' | 'system';
  reducedMotion?: boolean;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  const validation = PreferencesSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Dữ liệu giao diện không hợp lệ.' };
  }

  await prisma.userSettings.upsert({
    where: { userId: currentUser.id },
    create: {
      userId: currentUser.id,
      theme: validation.data.theme,
      reducedMotion: validation.data.reducedMotion ?? false,
    },
    update: {
      theme: validation.data.theme,
      reducedMotion: validation.data.reducedMotion ?? false,
    },
  });

  try {
    revalidatePath('/settings/preferences');
  } catch {}

  return { success: true };
}

// =========================================================================
// 9. ACCOUNT DELETION (SENSITIVE ACTION)
// =========================================================================

export async function deleteAccountAction(passwordConfirm?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Yêu cầu đăng nhập.' };
  }

  const rateLimit = await checkRateLimit(`settings:delete:${currentUser.id}`, RATE_LIMIT_PRESETS.AUTH);
  if (!rateLimit.allowed) {
    return { success: false, error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
  });
  if (!dbUser) return { success: false, error: 'Người dùng không tồn tại.' };

  // Re-authentication verification if password is set
  if (dbUser.passwordHash) {
    if (!passwordConfirm) {
      return { success: false, error: 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản vĩnh viễn.' };
    }
    const isCorrect = await verifyPassword(passwordConfirm, dbUser.passwordHash);
    if (!isCorrect) {
      return { success: false, error: 'Mật khẩu xác nhận không chính xác.' };
    }
  }

  // Atomically delete user account (cascades to sessions, accounts, memberships, settings, collections, reactions, comments)
  await prisma.user.delete({
    where: { id: currentUser.id },
  });

  await clearCurrentUser();

  try {
    revalidatePath('/');
  } catch {}

  return { success: true };
}
