'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileAction } from '@/actions/settings';
import { Loader2, Sparkles, Plus, X, RefreshCw } from 'lucide-react';
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
  const [displayName, setDisplayName] = useState(initialData.displayName);
  const [username, setUsername] = useState(initialData.username);
  const [bio, setBio] = useState(initialData.bio);
  const [interests, setInterests] = useState<string[]>(initialData.interests || []);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [customTag, setCustomTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(username || 'seed')}`;
  const currentAvatarSrc = avatarUrl || defaultAvatar;

  const handleRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const newAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(randomSeed)}`;
    setAvatarUrl(newAvatar);
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Ảnh đại diện
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img
            src={currentAvatarSrc}
            alt="Avatar preview"
            className="w-20 h-20 rounded-full object-cover ring-2 ring-border shrink-0 bg-secondary"
          />
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRandomAvatar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tạo ngẫu nhiên (DiceBear)</span>
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Dùng mặc định
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Hoặc dán URL ảnh trực tiếp (https://...)"
                className="w-full text-xs px-3.5 py-2 rounded-xl bg-secondary/40 border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
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
