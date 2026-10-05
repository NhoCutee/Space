'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSpace } from '@/actions/spaces';
import { slugify } from '@/lib/utils';
import {
  Sparkles,
  UploadCloud,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  Loader2,
  Compass,
  Palette,
  AlertCircle,
  X,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImageOnClient } from '@/lib/media/client';

const POPULAR_CATEGORIES = [
  'Architecture',
  'Minimalist Living',
  'Visual Arts',
  'Typography',
  'Photography',
  'Industrial Design',
  'Tech & Workspace',
  'Urban Aesthetics',
  'Coffee & Cafes',
  'Interior & Objects',
];

const CURATED_PRESET_COVERS = [
  {
    title: 'Minimalist Concrete',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80',
    category: 'Architecture',
  },
  {
    title: 'Warm Editorial Studio',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
    category: 'Workspace',
  },
  {
    title: 'Tokyo Rain Neon',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80',
    category: 'Photography',
  },
  {
    title: 'Monochrome Brutalism',
    url: 'https://images.unsplash.com/photo-1513346940221-6f673d962e97?w=1200&q=80',
    category: 'Design',
  },
  {
    title: 'Botanical Sanctuary',
    url: 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=1200&q=80',
    category: 'Minimalist Living',
  },
];

const THEME_COLORS = [
  { name: 'Obsidian', hex: '#18181b', border: 'border-zinc-800' },
  { name: 'Pure Dark', hex: '#09090b', border: 'border-zinc-900' },
  { name: 'Indigo Night', hex: '#312e81', border: 'border-indigo-900' },
  { name: 'Emerald Forest', hex: '#064e3b', border: 'border-emerald-900' },
  { name: 'Slate Calm', hex: '#1e293b', border: 'border-slate-800' },
  { name: 'Terracotta Warm', hex: '#7c2d12', border: 'border-amber-950' },
  { name: 'Velvet Plum', hex: '#581c87', border: 'border-purple-950' },
];

export interface CreatedSpaceData {
  id: string;
  slug: string;
  name: string;
  category?: string;
  coverImageUrl?: string;
}

interface CreateSpaceFormProps {
  onSuccess?: (spaceSlug: string, space?: CreatedSpaceData) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function CreateSpaceForm({
  onSuccess,
  onCancel,
  isModal = false,
}: CreateSpaceFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [category, setCategory] = useState('Architecture');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [themeColor, setThemeColor] = useState('#18181b');

  // Cover image states
  const [coverMode, setCoverMode] = useState<'upload' | 'url' | 'preset'>('upload');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverStatus, setCoverStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Computed slug preview
  const liveSlug = customSlug.trim()
    ? slugify(customSlug)
    : slugify(name || 'new-space');

  // Reusable File Processing Logic with Instant Optimistic Preview + Background Worker
  const processCoverFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ hỗ trợ tệp hình ảnh (JPEG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Dung lượng ảnh bìa tối đa 50MB');
      return;
    }

    // 1. Instant Optimistic Preview (0ms delay)
    const objectUrl = URL.createObjectURL(file);
    setCoverImageUrl(objectUrl);
    setCoverStatus('uploading');
    setUploading(true);
    setErrorMessage('');

    try {
      // 2. Client-side fast compression
      const uploadFile = await compressImageOnClient(file);
      const formData = new FormData();
      formData.append('file', uploadFile);

      // 3. Staging and background queue dispatch
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tải ảnh lên thất bại');
      }

      setCoverStatus('processing');

      // 4. Background status polling until Cloudinary ready
      if (data.mediaId && (!data.url || data.status === 'PROCESSING' || data.status === 'PENDING')) {
        let attempts = 0;
        const maxAttempts = 35;
        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 600));
          attempts++;
          try {
            const statusRes = await fetch(`/api/media/${data.mediaId}/status`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === 'READY' && statusData.url) {
                setCoverImageUrl(statusData.url);
                setCoverStatus('ready');
                URL.revokeObjectURL(objectUrl);
                toast.success('Ảnh bìa đã sẵn sàng trên Cloudinary CDN!');
                break;
              }
              if (statusData.status === 'FAILED') {
                throw new Error(statusData.errorMessage || 'Tối ưu hóa ảnh thất bại');
              }
            }
          } catch (pollErr) {
            if (attempts >= maxAttempts) throw pollErr;
          }
        }
      } else if (data.url) {
        setCoverImageUrl(data.url);
        setCoverStatus('ready');
        URL.revokeObjectURL(objectUrl);
        toast.success('Ảnh bìa đã sẵn sàng!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CreateSpaceForm] Cover upload error:', err);
      setCoverStatus('error');
      toast.error(`Lỗi tải ảnh: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCoverFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCoverFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput.trim());
      setCoverImageUrl(urlInput.trim());
      setCoverStatus('ready');
      toast.success('Đã áp dụng liên kết ảnh bìa');
    } catch {
      toast.error('Vui lòng nhập đường link ảnh hợp lệ (HTTP/HTTPS)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (name.trim().length < 2) {
      setErrorMessage('Tên Space phải có ít nhất 2 ký tự');
      return;
    }

    const effectiveCategory = category === 'Custom' ? customCategory.trim() : category;
    if (!effectiveCategory) {
      setErrorMessage('Vui lòng chọn hoặc nhập danh mục cho Space');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage('Mô tả/Tuyên ngôn phải có ít nhất 10 ký tự');
      return;
    }

    if (!coverImageUrl) {
      setErrorMessage('Vui lòng cung cấp ảnh bìa (tải lên, liên kết hoặc chọn ảnh mẫu)');
      return;
    }

    setSubmitting(true);

    try {
      const res = await createSpace({
        name: name.trim(),
        description: description.trim(),
        category: effectiveCategory,
        coverImageUrl: coverImageUrl.trim(),
        slug: liveSlug,
        themeColor,
        guidelines: guidelines.trim() || undefined,
      });

      if (!res.success || !res.space) {
        setErrorMessage(res.error || 'Tạo Space thất bại');
        toast.error(res.error || 'Tạo Space thất bại');
        setSubmitting(false);
        return;
      }

      toast.success(`Space "${res.space.name}" đã được khởi tạo thành công!`);

      if (onSuccess) {
        onSuccess(res.space.slug, res.space);
      } else {
        router.push(`/s/${res.space.slug}`);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
      toast.error('Đã xảy ra lỗi khi tạo Space');
      setSubmitting(false);
    }
  };

  // Reusable Cover Image Upload & Framing Section
  const renderCoverSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground">
          <ImageIcon className="w-4 h-4 text-emerald-500" />
          <span>1. Visual Masthead Cover <span className="text-rose-500">*</span></span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-zinc-100 dark:bg-secondary/70 p-0.5 rounded-xl border border-zinc-200 dark:border-border/60">
          <button
            type="button"
            onClick={() => setCoverMode('upload')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              coverMode === 'upload'
                ? 'bg-white dark:bg-card text-foreground shadow-xs'
                : 'text-zinc-500 dark:text-muted-foreground hover:text-foreground'
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setCoverMode('url')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              coverMode === 'url'
                ? 'bg-white dark:bg-card text-foreground shadow-xs'
                : 'text-zinc-500 dark:text-muted-foreground hover:text-foreground'
            }`}
          >
            Image URL
          </button>
          <button
            type="button"
            onClick={() => setCoverMode('preset')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              coverMode === 'preset'
                ? 'bg-white dark:bg-card text-foreground shadow-xs'
                : 'text-zinc-500 dark:text-muted-foreground hover:text-foreground'
            }`}
          >
            Curated Presets
          </button>
        </div>
      </div>

      {/* Cover Mode Panels */}
      {coverMode === 'upload' && !coverImageUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group ${
            isDragging
              ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]'
              : 'border-zinc-300 dark:border-border/80 hover:border-zinc-500 dark:hover:border-foreground/40 bg-zinc-50/60 dark:bg-secondary/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all duration-200 shadow-inner ${
              isDragging
                ? 'bg-primary text-primary-foreground scale-110 shadow-lg'
                : 'bg-zinc-100 dark:bg-secondary text-zinc-500 dark:text-muted-foreground group-hover:text-zinc-900 dark:group-hover:text-foreground'
            }`}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <UploadCloud
                className={`w-6 h-6 ${isDragging ? 'animate-bounce' : ''}`}
              />
            )}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-foreground">
            {isDragging
              ? 'Thả ảnh bìa vào đây để tải lên ngay!'
              : uploading
              ? 'Đang tối ưu hóa ảnh bìa...'
              : 'Tải lên ảnh bìa (Space Cover)'}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-muted-foreground mt-1">
            {isDragging
              ? 'Thả ảnh vào để áp dụng làm ảnh bìa'
              : 'Kéo thả hoặc bấm để chọn ảnh (Xem trước tức thì • JPEG, PNG, WebP, GIF tối đa 50MB)'}
          </p>
        </div>
      )}

      {coverMode === 'url' && !coverImageUrl && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-muted-foreground" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste direct image link (e.g. https://images.unsplash.com/...)"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-secondary/50 border border-zinc-200 dark:border-border/70 text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyUrl}
            disabled={!urlInput.trim()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-secondary dark:hover:bg-secondary/80 text-zinc-900 dark:text-foreground border border-zinc-200 dark:border-border/80 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}

      {coverMode === 'preset' && !coverImageUrl && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CURATED_PRESET_COVERS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => {
                setCoverImageUrl(preset.url);
                setCoverStatus('ready');
                toast.success(`Đã chọn "${preset.title}"`);
              }}
              className="group relative rounded-xl overflow-hidden aspect-[16/9] border border-border/70 hover:border-foreground/40 text-left transition-all cursor-pointer shadow-xs"
            >
              <img
                src={preset.url}
                alt={preset.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                <span className="text-[11px] font-bold text-white leading-tight drop-shadow-xs">{preset.title}</span>
                <span className="text-[9px] text-zinc-300 font-medium">{preset.category}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Live Preview Frame: Perfectly Fits Frame Edge-to-Edge with Ambient Blur */}
      {coverImageUrl && (
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-200 dark:border-border/80 bg-zinc-100 dark:bg-zinc-900/60 shadow-md group flex items-center justify-center">
          {/* Ambient blurred backdrop to gracefully fill any edge case */}
          <img
            src={coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
          />
          {/* Main cover image: fits edge-to-edge */}
          <img
            src={coverImageUrl}
            alt="Space cover"
            className="relative w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Status Badge */}
          {coverStatus === 'uploading' && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-background/90 text-foreground backdrop-blur-md flex items-center gap-1.5 shadow-sm border border-border/40">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Đang tải lên...</span>
            </div>
          )}
          {coverStatus === 'processing' && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-background/90 text-foreground backdrop-blur-md flex items-center gap-1.5 shadow-sm border border-border/40">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Đang tối ưu hóa...</span>
            </div>
          )}
          {coverStatus === 'ready' && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm">
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Sẵn sàng</span>
            </div>
          )}
          {coverStatus === 'error' && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-rose-500/90 text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm">
              <AlertCircle className="w-3 h-3" />
              <span>Tải lên thất bại</span>
            </div>
          )}

          {/* Cinematic info overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 sm:p-5 flex flex-col justify-end pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
              {category === 'Custom' ? (customCategory || 'Category') : category}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white drop-shadow leading-tight mt-0.5">
              {name || 'Tên Space của bạn'}
            </h3>
            <span className="text-[10px] text-zinc-300 font-mono mt-0.5">
              /s/{liveSlug}
            </span>
          </div>

          {/* Remove / Change button */}
          <button
            type="button"
            onClick={() => {
              setCoverImageUrl('');
              setCoverStatus('idle');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground backdrop-blur-md transition-colors cursor-pointer shadow-md"
            title="Đổi ảnh khác"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  // Atmospheric Accent Color Section
  const renderAccentColorSection = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground">
        <Palette className="w-4 h-4 text-amber-500" />
        <span>2. Atmospheric Accent Color</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {THEME_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => setThemeColor(color.hex)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              themeColor === color.hex
                ? 'border-foreground shadow-xs bg-zinc-100 dark:bg-secondary text-foreground'
                : 'border-zinc-200 dark:border-border/60 hover:bg-zinc-50 dark:hover:bg-secondary/40 text-muted-foreground'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full border border-white/20 shrink-0"
              style={{ backgroundColor: color.hex }}
            />
            <span>{color.name}</span>
            {themeColor === color.hex && <Check className="w-3 h-3 text-foreground ml-0.5" />}
          </button>
        ))}
      </div>
    </div>
  );

  // Space Identity Form Fields
  const renderIdentityFields = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground">
        <Compass className="w-4 h-4 text-indigo-500" />
        <span>Space Identity & Manifesto</span>
      </div>

      {/* Space Name */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
          Space Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Minimalist Architecture, Cyberpunk Streetwear, Tokyo Typo"
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-border/80 bg-zinc-50/50 dark:bg-secondary/30 text-foreground text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20 font-medium transition-all"
        />
        <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-mono text-[11px] truncate">
            <span>URL:</span>
            <span className="text-foreground/80">/s/{liveSlug}</span>
            {!isEditingSlug ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditingSlug(true);
                  setCustomSlug(liveSlug);
                }}
                className="text-indigo-500 hover:underline ml-1 cursor-pointer font-sans"
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingSlug(false)}
                className="text-emerald-500 hover:underline ml-1 cursor-pointer font-sans"
              >
                Auto
              </button>
            )}
          </div>
          <span>{name.length}/60</span>
        </div>

        {isEditingSlug && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">/s/</span>
            <input
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              placeholder="custom-slug"
              className="flex-1 px-3 py-1.5 rounded-xl border border-border/70 bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
          Primary Category <span className="text-rose-500">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {POPULAR_CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setCustomCategory('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-foreground text-background shadow-xs scale-102'
                    : 'bg-zinc-100 dark:bg-secondary/60 hover:bg-zinc-200/70 dark:hover:bg-secondary text-muted-foreground hover:text-foreground border border-zinc-200/80 dark:border-border/50'
                }`}
              >
                {cat}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCategory('Custom')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              category === 'Custom'
                ? 'bg-foreground text-background shadow-xs'
                : 'bg-zinc-100 dark:bg-secondary/60 hover:bg-zinc-200/70 dark:hover:bg-secondary text-muted-foreground hover:text-foreground border border-zinc-200/80 dark:border-border/50'
            }`}
          >
            + Other
          </button>
        </div>

        {category === 'Custom' && (
          <input
            type="text"
            required
            maxLength={40}
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Enter category name (e.g. Modular Synth, Ceramic Crafts)"
            className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-border/80 bg-zinc-50/50 dark:bg-secondary/30 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
          />
        )}
      </div>

      {/* Description / Manifesto */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
          Manifesto / Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          required
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What aesthetic, crafts, or discussions belong here? Give your community a clear vision..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-border/80 bg-zinc-50/50 dark:bg-secondary/30 text-foreground text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20 resize-none leading-relaxed transition-all"
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
          <span>Min 10 characters</span>
          <span>{description.length}/500</span>
        </div>
      </div>

      {/* Community Guidelines */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
          <span>Community Guidelines (Optional)</span>
          <span className="text-[10px] text-muted-foreground font-normal lowercase">optional</span>
        </label>
        <textarea
          rows={2}
          maxLength={400}
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          placeholder="e.g. Only original photography. High resolution required. No unsolicited promotions."
          className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-border/80 bg-zinc-50/50 dark:bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20 resize-none leading-relaxed transition-all"
        />
      </div>
    </div>
  );

  // Footer Actions
  const renderActions = () => (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-border/50">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground hover:bg-zinc-100 dark:hover:bg-secondary transition-all cursor-pointer"
        >
          Cancel
        </button>
      )}

      <button
        type="submit"
        disabled={submitting || !coverImageUrl || !name.trim()}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Creating Space...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Space</span>
          </>
        )}
      </button>
    </div>
  );

  // If used in Modal: Clean single-column layout
  if (isModal) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {renderCoverSection()}
        {renderIdentityFields()}
        {renderAccentColorSection()}
        {renderActions()}
      </form>
    );
  }

  // Standalone Page Layout: Wide 2-column editorial grid matching DropComposer
  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header matching DropComposer */}
      <div className="mb-8">
        <div className="mb-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Explore</span>
          </Link>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Genesis Space Creator</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Found a Visual Space
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Spaces are focused visual commons dedicated to a single aesthetic, design philosophy, or creative craft.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual Cover & Accent (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-6">
            {renderCoverSection()}
            <div className="pt-4 border-t border-zinc-100 dark:border-border/50">
              {renderAccentColorSection()}
            </div>
          </div>
        </div>

        {/* Right Column: Space Details & Launch CTA (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-5">
            {renderIdentityFields()}
            {renderActions()}
          </div>
        </div>
      </div>
    </form>
  );
}
