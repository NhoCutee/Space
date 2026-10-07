'use client';

import { useState } from 'react';
import Link from 'next/link';
import { changePasswordAction } from '@/actions/settings';
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Laptop,
  ChevronRight,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface SecurityFormProps {
  hasPassword: boolean;
}

export function SecurityForm({ hasPassword }: SecurityFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Policy checkers
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isPolicySatisfied =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (hasPassword && !currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!isPolicySatisfied) {
      toast.error('Vui lòng đáp ứng đầy đủ tất cả tiêu chuẩn mật khẩu an toàn bên dưới.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        toast.error(res.error || 'Cập nhật mật khẩu thất bại.');
        return;
      }

      toast.success('Đã cập nhật mật khẩu thành công!', {
        description: 'Tất cả các phiên đăng nhập khác đã được thu hồi an toàn.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('[SecurityForm] Error:', err);
      toast.error('Có lỗi xảy ra khi cập nhật mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Change Password Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {hasPassword ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu mới'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPasswords ? 'Ẩn ký tự' : 'Hiện ký tự'}</span>
          </button>
        </div>

        {hasPassword && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Mật khẩu hiện tại</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Mật khẩu mới</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Xác nhận mật khẩu mới</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>
        </div>

        {/* Password Strength Checklist */}
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tiêu chuẩn mật khẩu an toàn
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              {hasMinLength ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <span className={hasMinLength ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Tối thiểu 8 ký tự
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasUppercase ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <span className={hasUppercase ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Ít nhất 1 chữ hoa (A-Z)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasLowercase ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <span className={hasLowercase ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Ít nhất 1 chữ thường (a-z)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasNumber ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <span className={hasNumber ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Ít nhất 1 chữ số (0-9)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasSpecial ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <span className={hasSpecial ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Ít nhất 1 ký tự đặc biệt (!@#$...)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {passwordsMatch ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <span className={passwordsMatch ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Khớp mật khẩu xác nhận
              </span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            Vì lý do an toàn, khi bạn cập nhật mật khẩu, hệ thống sẽ tự động thu hồi tất cả các phiên đăng nhập đang hoạt động trên các trình duyệt và thiết bị khác.
          </span>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !isPolicySatisfied}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang cập nhật...</span>
              </>
            ) : (
              <span>{hasPassword ? 'Cập nhật mật khẩu' : 'Thiết lập mật khẩu'}</span>
            )}
          </button>
        </div>
      </form>

      {/* 2. Fast Navigation to Sessions */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Quản lý phiên đăng nhập</div>
              <div className="text-[11px] text-muted-foreground">
                Xem chi tiết các thiết bị và đăng xuất tài khoản từ xa
              </div>
            </div>
          </div>

          <Link
            href="/settings/sessions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 transition-all cursor-pointer"
          >
            <span>Xem thiết bị</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
