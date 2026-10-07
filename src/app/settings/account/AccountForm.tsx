'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeEmailAction, deleteAccountAction } from '@/actions/settings';
import {
  Mail,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Trash2,
  KeyRound,
  X,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface AccountFormProps {
  initialData: {
    email: string;
    username: string;
    role: string;
    createdAtFormatted: string;
    hasPassword: boolean;
  };
}

export function AccountForm({ initialData }: AccountFormProps) {
  const router = useRouter();

  // Email state
  const [currentEmail, setCurrentEmail] = useState(initialData.email);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Email update handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingEmail) return;

    if (!newEmail.trim()) {
      toast.error('Vui lòng nhập email mới.');
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      toast.warning('Email mới trùng với email hiện tại.');
      return;
    }

    if (initialData.hasPassword && !currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại để xác nhận.');
      return;
    }

    setIsChangingEmail(true);
    try {
      const res = await changeEmailAction(newEmail.trim(), currentPassword || undefined);
      if (!res.success) {
        toast.error(res.error || 'Đổi email thất bại.');
        return;
      }

      toast.success('Đã cập nhật địa chỉ email thành công!');
      setCurrentEmail(res.email || newEmail.trim());
      setNewEmail('');
      setCurrentPassword('');
      router.refresh();
    } catch (err: unknown) {
      console.error('[AccountForm] Change email error:', err);
      toast.error('Có lỗi xảy ra khi đổi email.');
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeleting) return;

    if (initialData.hasPassword) {
      if (!deletePassword) {
        toast.error('Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.');
        return;
      }
    } else {
      if (deleteConfirmText.trim() !== 'XÓA TÀI KHOẢN') {
        toast.error('Vui lòng nhập chính xác "XÓA TÀI KHOẢN" để xác nhận.');
        return;
      }
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccountAction(initialData.hasPassword ? deletePassword : undefined);
      if (!res.success) {
        toast.error(res.error || 'Không thể xóa tài khoản.');
        setIsDeleting(false);
        return;
      }

      toast.success('Tài khoản đã được xóa vĩnh viễn.');
      setIsDeleteModalOpen(false);
      window.location.href = '/';
    } catch (err: unknown) {
      console.error('[AccountForm] Delete error:', err);
      toast.error('Có lỗi xảy ra khi xóa tài khoản.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Account Details Section */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Trạng thái & Quyền hạn
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Trạng thái
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đang hoạt động</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Vai trò hệ thống
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{initialData.role}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Ngày gia nhập
            </span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{initialData.createdAtFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Change Email Section */}
      <form onSubmit={handleEmailSubmit} className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Địa chỉ email</h3>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Email hiện tại</label>
          <div className="text-sm font-semibold text-foreground px-3.5 py-2.5 rounded-xl bg-secondary/30 border border-border/50 select-all font-mono">
            {currentEmail}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Email mới</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ten@example.com"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
          </div>

          {initialData.hasPassword && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Xác nhận mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isChangingEmail || !newEmail.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isChangingEmail ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Cập nhật email</span>
            )}
          </button>
        </div>
      </form>

      {/* 3. Danger Zone: Delete Account */}
      <div className="p-6 rounded-3xl glass border border-destructive/30 bg-destructive/5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold">Vùng nguy hiểm</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="text-xs font-bold text-foreground">Xóa tài khoản vĩnh viễn</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Xóa vĩnh viễn tài khoản của bạn cùng toàn bộ tác phẩm sáng tác, bộ sưu tập, tương tác và tất cả các phiên đăng nhập. Hành động này không thể khôi phục.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa tài khoản</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl glass border border-destructive/40 bg-card shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold">Xác nhận xóa tài khoản</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản <span className="font-bold text-foreground">@{initialData.username}</span>? Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn ngay lập tức.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {initialData.hasPassword ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nhập mật khẩu của bạn để xác nhận
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/80 focus:outline-none focus:ring-2 focus:ring-destructive/30 text-foreground"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nhập chính xác <span className="text-destructive font-mono font-bold">XÓA TÀI KHOẢN</span> để xác nhận
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="XÓA TÀI KHOẢN"
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/80 focus:outline-none focus:ring-2 focus:ring-destructive/30 text-foreground"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <span>Xác nhận xóa vĩnh viễn</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
