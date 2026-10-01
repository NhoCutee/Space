'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

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

interface CreateSpaceFormProps {
  onSuccess?: (spaceSlug: string) => void;
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
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Computed slug preview
  const liveSlug = customSlug.trim()
    ? slugify(customSlug)
    : slugify(name || 'new-space');

  // Handle image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPEG, PNG, WebP) are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be under 10MB');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setCoverImageUrl(data.url);
      toast.success('Cover image uploaded successfully');
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput.trim());
      setCoverImageUrl(urlInput.trim());
      toast.success('Cover image URL applied');
    } catch {
      toast.error('Please enter a valid HTTP/HTTPS image URL');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Pre-flight client validations
    if (name.trim().length < 2) {
      setErrorMessage('Space name must be at least 2 characters');
      return;
    }

    const effectiveCategory = category === 'Custom' ? customCategory.trim() : category;
    if (!effectiveCategory) {
      setErrorMessage('Please select or specify a category');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage('Description must be at least 10 characters to explain your Space purpose');
      return;
    }

    if (!coverImageUrl) {
      setErrorMessage('Please provide a cover image (upload, URL, or preset)');
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
        setErrorMessage(res.error || 'Failed to create Space');
        toast.error(res.error || 'Failed to create Space');
        setSubmitting(false);
        return;
      }

      toast.success(`Space "${res.space.name}" created successfully!`);

      if (onSuccess) {
        onSuccess(res.space.slug);
      } else {
        router.push(`/s/${res.space.slug}`);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      toast.error('An unexpected error occurred');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Space Identity */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Compass className="w-4 h-4 text-indigo-500" />
          <span>Space Identity</span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Space Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Minimalist Architecture, Cyberpunk Streetwear, Tokyo Typo"
            className="w-full px-4 py-2.5 rounded-2xl border border-border/80 bg-secondary/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
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
                  className="text-indigo-400 hover:underline ml-1 cursor-pointer"
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(false)}
                  className="text-emerald-500 hover:underline ml-1 cursor-pointer"
                >
                  Auto
                </button>
              )}
            </div>
            <span>{name.length}/60</span>
          </div>

          {/* Custom Slug input when user opts to edit */}
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
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Primary Category <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2.5">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-foreground text-background shadow-sm scale-102'
                      : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCategory('Custom')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                category === 'Custom'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50'
              }`}
            >
              + Other / Custom
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
              className="w-full px-4 py-2 rounded-xl border border-border/80 bg-secondary/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          )}
        </div>

        {/* Space Description */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Manifesto / Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What aesthetic, crafts, or discussions belong here? Give your community a clear vision..."
            className="w-full px-4 py-2.5 rounded-2xl border border-border/80 bg-secondary/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed"
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
            <span>Min 10 characters</span>
            <span>{description.length}/500</span>
          </div>
        </div>
      </div>

      {/* Section 2: Visual Masthead / Cover Image */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span>Masthead Cover Image <span className="text-rose-500">*</span></span>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center bg-secondary/70 p-0.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setCoverMode('upload')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                coverMode === 'upload'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setCoverMode('url')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                coverMode === 'url'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Image URL
            </button>
            <button
              type="button"
              onClick={() => setCoverMode('preset')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                coverMode === 'preset'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Curated Presets
            </button>
          </div>
        </div>

        {/* Cover Mode Panels */}
        {coverMode === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/80 hover:border-indigo-500/60 rounded-3xl p-6 sm:p-8 text-center cursor-pointer bg-secondary/20 hover:bg-secondary/40 transition-all flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                <span className="text-xs font-semibold text-muted-foreground">Uploading cover image...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-1">
                  <UploadCloud className="w-6 h-6 text-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground">Click to upload Space cover</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP up to 10MB. High resolution landscape recommended.</p>
              </>
            )}
          </div>
        )}

        {coverMode === 'url' && (
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste direct image link (e.g. https://images.unsplash.com/...)"
              className="flex-1 px-4 py-2.5 rounded-2xl border border-border/80 bg-secondary/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-4 py-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border border-border/60 transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}

        {coverMode === 'preset' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CURATED_PRESET_COVERS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => {
                  setCoverImageUrl(preset.url);
                  toast.success(`Selected "${preset.title}"`);
                }}
                className={`group relative rounded-2xl overflow-hidden aspect-[16/9] border-2 text-left transition-all cursor-pointer ${
                  coverImageUrl === preset.url
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-border/60 hover:border-foreground/40'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preset.url}
                  alt={preset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                  <span className="text-[11px] font-bold text-white leading-tight drop-shadow-sm">{preset.title}</span>
                  <span className="text-[9px] text-zinc-300 font-medium">{preset.category}</span>
                </div>
                {coverImageUrl === preset.url && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Live Preview of Selected Cover */}
        {coverImageUrl && (
          <div className="relative rounded-3xl overflow-hidden aspect-[21/9] border border-border shadow-lg mt-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt="Space cover preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                {category === 'Custom' ? (customCategory || 'Category') : category}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow">
                {name || 'Your Space Name'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCoverImageUrl('')}
              className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/70 hover:bg-black text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* Section 3: Aesthetics & Guidelines (Optional) */}
      <div className="space-y-5 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Palette className="w-4 h-4 text-amber-500" />
          <span>Space Accent & Guidelines</span>
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Atmospheric Accent Color
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {THEME_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => setThemeColor(color.hex)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  themeColor === color.hex
                    ? 'border-foreground shadow-sm bg-secondary'
                    : 'border-border/60 hover:bg-secondary/40 text-muted-foreground'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <span>{color.name}</span>
                {themeColor === color.hex && <Check className="w-3 h-3 text-foreground ml-0.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Guidelines */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center justify-between">
            <span>Community Guidelines (Optional)</span>
            <span className="text-xs text-muted-foreground font-normal">Optional</span>
          </label>
          <textarea
            rows={2}
            maxLength={400}
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            placeholder="e.g. Only original photography. High resolution required. No unsolicited promotions."
            className="w-full px-4 py-2.5 rounded-2xl border border-border/80 bg-secondary/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Footer Form Actions */}
      <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={submitting || !coverImageUrl || !name.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-foreground text-background hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md cursor-pointer"
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
    </form>
  );
}
