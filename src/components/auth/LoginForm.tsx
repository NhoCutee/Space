'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { loginAction, registerAction, getOAuthUrlAction } from '@/actions/auth';
import { LoginInputSchema, RegisterInputSchema, getSafeRedirectUrl } from '@/lib/security/validation';
import { toast } from 'sonner';

interface LoginFormProps {
  redirectTarget?: string;
  availableProviders?: ('google' | 'github')[];
  initialError?: string;
  defaultMode?: 'login' | 'register';
}

export function LoginForm({
  redirectTarget = '/',
  availableProviders = [],
  initialError,
  defaultMode = 'login',
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'login' | 'register'>(
    (searchParams?.get('mode') as 'login' | 'register') || defaultMode
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);

  // Form State - Login
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form State - Register
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Error & Status State
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Ensure redirect target is strictly sanitized
  const safeRedirect = getSafeRedirectUrl(redirectTarget, '/');

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side UX validation
    const validation = LoginInputSchema.safeParse({
      identifier: identifier.trim(),
      password: loginPassword,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const res = await loginAction(identifier.trim(), loginPassword);

        if (!res.success) {
          setErrorMessage(res.error || 'Thông tin đăng nhập không chính xác.');
          return;
        }

        toast.success('Đăng nhập thành công', {
          description: `Chào mừng trở lại, ${res.user?.displayName || 'bạn'}!`,
        });

        // Navigate to sanitized redirect destination and refresh server context
        router.push(safeRedirect);
        router.refresh();
      } catch (err: unknown) {
        console.error('[LoginForm] Login error:', err);
        setErrorMessage('Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại sau.');
      }
    });
  };

  // Handle Register submission
  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const payload = {
      username: regUsername.trim().toLowerCase(),
      displayName: regDisplayName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
    };

    const validation = RegisterInputSchema.safeParse(payload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const res = await registerAction(payload);

        if (!res.success) {
          setErrorMessage(res.error || 'Đăng ký tài khoản không thành công.');
          return;
        }

        toast.success('Đăng ký thành công', {
          description: 'Tài khoản của bạn đã được khởi tạo an toàn.',
        });

        router.push(safeRedirect);
        router.refresh();
      } catch (err: unknown) {
        console.error('[LoginForm] Register error:', err);
        setErrorMessage('Không thể hoàn tất đăng ký lúc này. Vui lòng thử lại.');
      }
    });
  };

  // Handle OAuth initiation
  const handleOAuthClick = async (provider: 'google' | 'github') => {
    setErrorMessage(null);
    setOauthLoading(provider);

    try {
      const res = await getOAuthUrlAction(provider);
      if (res.success && res.authUrl) {
        // Redirect browser to provider authorization endpoint
        window.location.href = res.authUrl;
      } else {
        setErrorMessage(`Không thể kết nối với ${provider === 'google' ? 'Google' : 'GitHub'}.`);
        setOauthLoading(null);
      }
    } catch (err: unknown) {
      console.error('[LoginForm] OAuth initiation failed:', err);
      setErrorMessage('Đã xảy ra lỗi khi khởi tạo đăng nhập OAuth.');
      setOauthLoading(null);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-secondary/70 border border-border/60 hover:bg-secondary transition-all active:scale-95 group mb-4"
        >
          <div className="w-6 h-6 rounded-lg bg-foreground text-background flex items-center justify-center font-black text-xs tracking-tighter group-hover:scale-105 transition-transform shadow-xs">
            S
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
            SPACES
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          </span>
          <span className="text-xs text-muted-foreground/80 font-medium pl-1 border-l border-border/80">
            Visual Commons
          </span>
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {mode === 'login' ? 'Đăng nhập vào Spaces' : 'Tạo không gian của bạn'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
          {mode === 'login'
            ? 'Kết nối với cộng đồng sáng tạo và các bộ sưu tập thẩm mỹ.'
            : 'Khám phá các Không gian chủ đề và tuyển chọn góc nhìn nghệ thuật.'}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl transition-all">
        {/* Mode Switch Tabs */}
        <div className="flex items-center p-1 bg-secondary/80 rounded-xl mb-6 border border-border/50">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setFieldErrors({});
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
              setFieldErrors({});
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Đăng ký mới
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-4.5">
            {/* Identifier Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-identifier"
                className="block text-xs font-medium text-foreground tracking-wide"
              >
                Email hoặc tên người dùng
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isPending}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.identifier) {
                      setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                    }
                  }}
                  placeholder="maya_curates hoặc bạn@email.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-background/50 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 transition-all disabled:opacity-60 ${
                    fieldErrors.identifier
                      ? 'border-destructive focus-visible:ring-destructive/30'
                      : 'border-border focus-visible:ring-foreground/20 focus-visible:border-foreground/40'
                  }`}
                  aria-invalid={!!fieldErrors.identifier}
                  aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
                />
              </div>
              {fieldErrors.identifier && (
                <p id="identifier-error" className="text-[11px] text-destructive font-medium mt-1">
                  {fieldErrors.identifier}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-foreground tracking-wide"
                >
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  placeholder="Nhập mật khẩu..."
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm bg-background/50 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 transition-all disabled:opacity-60 ${
                    fieldErrors.password
                      ? 'border-destructive focus-visible:ring-destructive/30'
                      : 'border-border focus-visible:ring-foreground/20 focus-visible:border-foreground/40'
                  }`}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isPending}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-[11px] text-destructive font-medium mt-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || !identifier || !loginPassword}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-username"
                className="block text-xs font-medium text-foreground tracking-wide"
              >
                Tên đăng nhập (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isPending}
                  value={regUsername}
                  onChange={(e) => {
                    setRegUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => ({ ...prev, username: '' }));
                    }
                  }}
                  placeholder="ví dụ: quanghuy_dev"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-background/50 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 transition-all disabled:opacity-60 ${
                    fieldErrors.username
                      ? 'border-destructive focus-visible:ring-destructive/30'
                      : 'border-border focus-visible:ring-foreground/20 focus-visible:border-foreground/40'
                  }`}
                  aria-invalid={!!fieldErrors.username}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-[11px] text-destructive font-medium mt-1">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            {/* Display Name Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-displayname"
                className="block text-xs font-medium text-foreground tracking-wide"
              >
                Tên hiển thị
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                </div>
                <input
                  id="reg-displayname"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={isPending}
                  value={regDisplayName}
                  onChange={(e) => {
                    setRegDisplayName(e.target.value);
                    if (fieldErrors.displayName) {
                      setFieldErrors((prev) => ({ ...prev, displayName: '' }));
                    }
                  }}
                  placeholder="Quang Huy"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-background/50 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 transition-all disabled:opacity-60 ${
                    fieldErrors.displayName
                      ? 'border-destructive focus-visible:ring-destructive/30'
                      : 'border-border focus-visible:ring-foreground/20 focus-visible:border-foreground/40'
                  }`}
                  aria-invalid={!!fieldErrors.displayName}
                />
              </div>
              {fieldErrors.displayName && (
                <p className="text-[11px] text-destructive font-medium mt-1">
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-email"
                className="block text-xs font-medium text-foreground tracking-wide"
              >
                Địa chỉ email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  placeholder="ban@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-background/50 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 transition-all disabled:opacity-60 ${
                    fieldErrors.email
                      ? 'border-destructive focus-visible:ring-destructive/30'
                      : 'border-border focus-visible:ring-foreground/20 focus-visible:border-foreground/40'
                  }`}
                  aria-invalid={!!fieldErrors.email}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-destructive font-medium mt-1">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reg-password"
                className="block text-xs font-medium text-foreground tracking-wide"
              >
                Mật khẩu (tối thiểu 8 ký tự, có chữ & số)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isPending}
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm bg-background/50 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 transition-all disabled:opacity-60 ${
                    fieldErrors.password
                      ? 'border-destructive focus-visible:ring-destructive/30'
                      : 'border-border focus-visible:ring-foreground/20 focus-visible:border-foreground/40'
                  }`}
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isPending}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-destructive font-medium mt-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={isPending || !regUsername || !regDisplayName || !regEmail || !regPassword}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Tạo tài khoản</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* OAuth Social Logins - Strictly only rendered if configured */}
        {availableProviders.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/70">
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-muted-foreground mb-4 font-semibold">
              <span className="bg-card px-2.5">Hoặc tiếp tục với</span>
            </div>

            <div className="space-y-2.5">
              {availableProviders.includes('google') && (
                <button
                  type="button"
                  onClick={() => handleOAuthClick('google')}
                  disabled={isPending || oauthLoading !== null}
                  className="w-full py-2.5 px-4 rounded-xl border border-border/80 hover:bg-secondary/70 active:scale-[0.99] text-xs font-semibold text-foreground flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Tiếp tục với Google</span>
                </button>
              )}

              {availableProviders.includes('github') && (
                <button
                  type="button"
                  onClick={() => handleOAuthClick('github')}
                  disabled={isPending || oauthLoading !== null}
                  className="w-full py-2.5 px-4 rounded-xl border border-border/80 hover:bg-secondary/70 active:scale-[0.99] text-xs font-semibold text-foreground flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                  )}
                  <span>Tiếp tục với GitHub</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Security & Navigation Footer */}
      <div className="mt-8 text-center space-y-3">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
          <span>Phiên làm việc được mã hóa bảo mật & HttpOnly cookies</span>
        </div>

        <div>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
