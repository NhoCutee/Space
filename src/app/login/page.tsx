import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSafeRedirectUrl } from '@/lib/security/validation';
import { LoginForm } from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Đăng nhập — Spaces',
  description: 'Đăng nhập vào tài khoản Spaces của bạn để kết nối và tuyển chọn thẩm mỹ.',
};

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_exchange_failed: 'Không thể hoàn tất trao đổi xác thực với nhà cung cấp.',
  csrf_state_mismatch: 'Phiên xác thực OAuth không hợp lệ hoặc đã hết hạn (CSRF check).',
  invalid_state_signature: 'Chữ ký trạng thái OAuth không hợp lệ.',
  missing_code_or_state: 'Thiếu mã xác thực hoặc tham số trạng thái từ nhà cung cấp.',
  unsupported_provider: 'Nhà cung cấp OAuth không được hỗ trợ.',
  access_denied: 'Bạn đã hủy bỏ hoặc từ chối cấp quyền đăng nhập.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; authError?: string; mode?: string }>;
}) {
  const resolvedParams = await searchParams;

  // 1. If user is already authenticated, redirect immediately to safe destination
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const safeTarget = getSafeRedirectUrl(resolvedParams.redirect, '/');
    redirect(safeTarget);
  }

  // 2. Discover available OAuth providers based on server-side configuration
  const availableProviders: ('google' | 'github')[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    availableProviders.push('google');
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    availableProviders.push('github');
  }

  // 3. Resolve user-friendly error message if present in query params
  const initialError = resolvedParams.authError
    ? OAUTH_ERROR_MESSAGES[resolvedParams.authError] ||
      `Đã xảy ra lỗi xác thực (${resolvedParams.authError})`
    : undefined;

  const defaultMode = resolvedParams.mode === 'register' ? 'register' : 'login';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <LoginForm
        redirectTarget={resolvedParams.redirect}
        availableProviders={availableProviders}
        initialError={initialError}
        defaultMode={defaultMode}
      />
    </div>
  );
}
