'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileAction, uploadAvatarAction } from '@/actions/settings';
import { Loader2, Sparkles, Plus, X, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileFormProps {
  initialData: {
    displayName: string;
    username: string;
    bio: string;
    interests: string[];
    avatarUrl: string;
  };
}

const SUGGESTED_INTERESTS = [
  'Nhiếp ảnh đường phố',
  'Kiến trúc',
  'Tối giản',
  'Chân dung',
  'Điện ảnh',
  'Trừu tượng',
  'Cyberpunk',
  'Đen trắng',
  'Typography',
  'Phong cảnh',
  'Tư liệu',
  'Ý niệm',
];

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialData.displayName);
  const [username, setUsername] = useState(initialData.username);
  const [bio, setBio] = useState(initialData.bio);
  const [interests, setInterests] = useState<string[]>(initialData.interests || []);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [customTag, setCustomTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(username || 'seed')}`;
  const currentAvatarSrc = previewAvatar || avatarUrl || defaultAvatar;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 8MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Vui lòng chọn ảnh định dạng JPG, PNG, WebP hoặc GIF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Instant optimistic local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewAvatar(objectUrl);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await uploadAvatarAction(formData);
      if (!res.success || !res.avatarUrl) {
        toast.error(res.error || 'Tải ảnh lên thất bại.');
        setPreviewAvatar(null);
        return;
      }

      setAvatarUrl(res.avatarUrl);
      setPreviewAvatar(res.avatarUrl);
      toast.success('Đã tải và cập nhật ảnh đại diện thành công!');
      router.refresh();
    } catch (err: unknown) {
      console.error('[ProfileForm] Upload avatar error:', err);
      toast.error('Có lỗi xảy ra khi tải ảnh lên.');
      setPreviewAvatar(null);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleTag = (tag: string) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((t) => t !== tag));
    } else {
      if (interests.length >= 10) {
        toast.warning('Tối đa 10 chủ đề quan tâm.');
        return;
      }
      setInterests([...interests, tag]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTag.trim();
    if (!trimmed) return;
    if (interests.includes(trimmed)) {
      toast.info('Chủ đề này đã có trong danh sách.');
      setCustomTag('');
      return;
    }
    if (interests.length >= 10) {
      toast.warning('Tối đa 10 chủ đề quan tâm.');
      return;
    }
    setInterests([...interests, trimmed]);
    setCustomTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setInterests(interests.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!displayName.trim()) {
      toast.error('Vui lòng nhập tên hiển thị.');
      return;
    }

    if (!username.trim() || username.length < 3) {
      toast.error('Tên người dùng phải có ít nhất 3 ký tự.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfileAction({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim() || null,
        interests,
        avatarUrl: avatarUrl.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || 'Cập nhật thất bại.');
        return;
      }

      toast.success('Đã lưu hồ sơ cá nhân thành công!');
      router.refresh();
    } catch (err: unknown) {
      console.error('[ProfileForm] Error:', err);
      toast.error('Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Avatar Section */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ảnh đại diện
          </h3>
          <span className="text-[11px] text-muted-foreground">Tối đa 8MB • Tự động chuẩn hóa 400×400</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar Container with upload trigger on click */}
          <div className="relative group shrink-0 w-20 h-20">
            <img
              src={currentAvatarSrc}
              alt="Avatar preview"
              className="w-20 h-20 rounded-full object-cover ring-2 ring-border/80 bg-secondary"
            />
            {/* Overlay button */}
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer text-white disabled:opacity-100 disabled:bg-black/60"
              aria-label="Tải ảnh mới từ thiết bị"
              title="Nhấn để thay đổi ảnh đại diện"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="space-y-2 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarFileChange}
              disabled={isUploadingAvatar}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải lên...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh từ thiết bị</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tải ảnh chân dung hoặc tác phẩm đại diện của bạn từ máy tính. Hỗ trợ JPG, PNG, WebP hoặc GIF (tối đa 8MB).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Basic Info Section */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Thông tin cơ bản
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Tên hiển thị <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="VD: Maya Lin"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Tên hiển thị công khai trên các tác phẩm và bộ sưu tập.
            </p>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Tên người dùng (Username) <span className="text-destructive">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-medium text-muted-foreground">
                @
              </span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="mayalin"
                className="w-full text-sm pl-8 pr-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-mono"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Định danh duy nhất (chỉ gồm chữ thường, số và gạch dưới).
            </p>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Tiểu sử (Bio)</label>
            <span className="text-[11px] text-muted-foreground">{bio.length}/500</span>
          </div>
          <textarea
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Chia sẻ đôi nét về góc nhìn nghệ thuật, phong cách sáng tác của bạn..."
            className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* 3. Interests & Artistic Topics */}
      <div className="p-6 rounded-3xl glass border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Chủ đề nghệ thuật quan tâm
            </h3>
            <p className="text-xs text-muted-foreground">
              Chọn các chủ đề giúp cộng đồng khám phá góc nhìn của bạn ({interests.length}/10).
            </p>
          </div>
        </div>

        {/* Selected Tags */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {interests.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-xs animate-in fade-in"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:opacity-70 cursor-pointer"
                  aria-label={`Xóa thẻ ${tag}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggested Tags */}
        <div className="pt-2">
          <div className="text-[11px] font-semibold text-muted-foreground mb-2">Gợi ý chủ đề:</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_INTERESTS.map((tag) => {
              const isSelected = interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-secondary text-foreground font-semibold border-border line-through opacity-50'
                      : 'bg-background hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Tag Input */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomTag(e);
              }
            }}
            placeholder="Thêm chủ đề tùy chỉnh..."
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
          <button
            type="button"
            onClick={handleAddCustomTag}
            disabled={!customTag.trim()}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Lưu thay đổi hồ sơ</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
