"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createDrop, DropMediaInput } from "@/actions/drops";
import {
  UploadCloud,
  Link as LinkIcon,
  X,
  Plus,
  Loader2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  MapPin,
  Cpu,
  ChevronDown,
  Check,
  Palette,
  Wand2,
  RotateCcw,
  Search,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { CreateSpaceModal } from "@/components/spaces/CreateSpaceModal";
import { CreatedSpaceData } from "@/components/spaces/CreateSpaceForm";
import { compressImageOnClient } from "@/lib/media/client";

const PRESET_PALETTES = [
  {
    name: "Film Warmth",
    colors: ["#292524", "#78350f", "#d97706", "#fef3c7", "#f5f5f4"],
  },
  {
    name: "Tokyo Neon",
    colors: ["#0f172a", "#38bdf8", "#a855f7", "#ec4899", "#f43f5e"],
  },
  {
    name: "Monochrome Loft",
    colors: ["#09090b", "#27272a", "#52525b", "#a1a1aa", "#f4f4f5"],
  },
  {
    name: "Botanical Green",
    colors: ["#052e16", "#14532d", "#15803d", "#86efac", "#f0fdf4"],
  },
  {
    name: "Coffee & Roast",
    colors: ["#3e2723", "#795548", "#d7ccc8", "#bcaaa4", "#efebe9"],
  },
  {
    name: "Cyberpunk Night",
    colors: ["#050814", "#1e1b4b", "#4338ca", "#06b6d4", "#f43f5e"],
  },
];

interface SpaceOption {
  id: string;
  slug: string;
  name: string;
  category: string;
  coverImageUrl: string;
  membersCount?: number;
  ownerName?: string;
}

/** Context line that distinguishes Spaces sharing the same display name. */
function spaceContext(s: SpaceOption): string {
  const parts = [`/s/${s.slug}`];
  if (s.ownerName) parts.push(`by ${s.ownerName}`);
  if (typeof s.membersCount === "number") {
    parts.push(`${s.membersCount} member${s.membersCount === 1 ? "" : "s"}`);
  }
  return parts.join(" • ");
}

interface DropComposerProps {
  spaces: SpaceOption[];
  defaultSpaceSlug?: string;
  currentUsername?: string;
}

interface ComposerMediaItem extends DropMediaInput {
  clientKey?: string;
  status?: "uploading" | "processing" | "ready" | "error";
  errorMessage?: string;
}

export function DropComposer({
  spaces,
  defaultSpaceSlug,
  currentUsername,
}: DropComposerProps) {
  const router = useRouter();

  // Maintain local available spaces list so newly created spaces appear immediately without a full page reload!
  const [availableSpaces, setAvailableSpaces] = useState<SpaceOption[]>(spaces);

  // Preselect space only if defaultSpaceSlug is specified and matches
  const initialSpace = defaultSpaceSlug
    ? spaces.find((s) => s.slug === defaultSpaceSlug)
    : null;

  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(
    initialSpace?.id || "",
  );
  const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [spaceSearchQuery, setSpaceSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [locationName, setLocationName] = useState("");

  // Handle inline space creation without navigating away or losing form data!
  const handleSpaceCreated = (slug: string, newSpace?: CreatedSpaceData) => {
    setIsCreateSpaceModalOpen(false);
    if (newSpace) {
      const createdOption: SpaceOption = {
        id: newSpace.id,
        slug: newSpace.slug,
        name: newSpace.name,
        category: newSpace.category || "General",
        membersCount: 1,
        ownerName: currentUsername,
        coverImageUrl: newSpace.coverImageUrl || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80",
      };

      setAvailableSpaces((prev) => {
        if (prev.some((s) => s.id === createdOption.id)) return prev;
        return [createdOption, ...prev];
      });
      setSelectedSpaceId(createdOption.id);
      toast.success(`Space "${createdOption.name}" đã được tạo và tự động chọn cho Drop này!`);
    } else {
      router.refresh();
    }
  };

  // Media state with instant optimistic preview support
  const [mediaList, setMediaList] = useState<ComposerMediaItem[]>([]);
  const mediaListRef = useRef<ComposerMediaItem[]>(mediaList);
  mediaListRef.current = mediaList;

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Specs state
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: "", value: "" },
  ]);

  // Aesthetic Palette state
  const [palette, setPalette] = useState<string[]>([]);
  const [extractingPalette, setExtractingPalette] = useState(false);

  // Extract color palette from image using offscreen canvas
  const extractPaletteFromImage = (imgUrl: string, notify = true) => {
    setExtractingPalette(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setExtractingPalette(false);
          return;
        }
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;

        const sampled: Array<{ r: number; g: number; b: number }> = [];
        for (let i = 0; i < data.length; i += 4 * 8) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a > 128) {
            sampled.push({ r, g, b });
          }
        }

        const toHex = (c: number) => c.toString(16).padStart(2, "0");
        const hexColors: string[] = [];

        for (const col of sampled) {
          const hex = `#${toHex(col.r)}${toHex(col.g)}${toHex(col.b)}`;
          const isTooSimilar = hexColors.some((existing) => {
            const er = parseInt(existing.slice(1, 3), 16);
            const eg = parseInt(existing.slice(3, 5), 16);
            const eb = parseInt(existing.slice(5, 7), 16);
            const dist = Math.sqrt(
              (col.r - er) ** 2 + (col.g - eg) ** 2 + (col.b - eb) ** 2,
            );
            return dist < 42;
          });

          if (!isTooSimilar) {
            hexColors.push(hex);
            if (hexColors.length >= 5) break;
          }
        }

        if (hexColors.length >= 2) {
          setPalette(hexColors);
          if (notify)
            toast.success("Aesthetic palette extracted from visual asset!");
        } else if (notify) {
          toast.info(
            "Could not find enough distinct colors. Try picking colors or use presets.",
          );
        }
      } catch {
        if (notify)
          toast.info(
            "Auto-extract limited by image CORS. You can pick colors or choose presets!",
          );
      } finally {
        setExtractingPalette(false);
      }
    };
    img.onerror = () => {
      setExtractingPalette(false);
      if (notify)
        toast.info(
          "Image could not be sampled. Please choose a preset or pick manually.",
        );
    };
    img.src = imgUrl;
  };

  const updatePaletteColor = (idx: number, newColor: string) => {
    setPalette((prev) => {
      const next = [...prev];
      next[idx] = newColor;
      return next;
    });
  };

  const removePaletteColor = (idx: number) => {
    setPalette((prev) => prev.filter((_, i) => i !== idx));
  };

  const addColorInputRef = useRef<HTMLInputElement>(null);
  const activeColorIndexRef = useRef<number | null>(null);

  const addPaletteColor = () => {
    if (palette.length >= 6) return;
    const defaults = [
      "#18181b",
      "#f59e0b",
      "#3b82f6",
      "#10b981",
      "#ec4899",
      "#8b5cf6",
    ];
    const nextColor = defaults[palette.length % defaults.length];
    const targetIdx = palette.length;
    activeColorIndexRef.current = targetIdx;

    setPalette((prev) => [...prev, nextColor]);

    // Immediately trigger native color picker so user doesn't have to click twice
    if (addColorInputRef.current) {
      addColorInputRef.current.value = nextColor;
      try {
        if ("showPicker" in HTMLInputElement.prototype) {
          addColorInputRef.current.showPicker();
        } else {
          addColorInputRef.current.click();
        }
      } catch {
        addColorInputRef.current.click();
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate image dimensions
  const measureImage = (
    url: string,
  ): Promise<{ width: number; height: number; aspectRatio: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || 1200;
        const height = img.naturalHeight || 800;
        const aspectRatio = Number((width / height).toFixed(3));
        resolve({ width, height, aspectRatio });
      };
      img.onerror = () => {
        resolve({ width: 1200, height: 800, aspectRatio: 1.5 });
      };
      img.src = url;
    });
  };

  // Common file processing logic for both input select and drag-and-drop
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray || fileArray.length === 0) return;

    if (mediaList.length + fileArray.length > 10) {
      toast.error("You can add a maximum of 10 images per Drop");
      return;
    }

    const filesToUpload: { file: File; clientKey: string; objectUrl: string }[] = [];
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB limit`);
        continue;
      }
      const objectUrl = URL.createObjectURL(file);
      const clientKey = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
      filesToUpload.push({ file, clientKey, objectUrl });
    }

    if (filesToUpload.length === 0) return;

    if (fileInputRef.current) fileInputRef.current.value = "";

    // 1. INSTANT OPTIMISTIC PREVIEWS (0ms UI wait!)
    const initialItems: ComposerMediaItem[] = await Promise.all(
      filesToUpload.map(async ({ clientKey, objectUrl }) => {
        const dim = await measureImage(objectUrl);
        return {
          clientKey,
          url: objectUrl,
          width: dim.width,
          height: dim.height,
          aspectRatio: dim.aspectRatio,
          status: "uploading" as const,
        };
      })
    );

    // Render local previews into the composer immediately
    setMediaList((prev) => [...prev, ...initialItems]);

    // Extract aesthetic palette immediately from first image
    if (palette.length === 0 && initialItems.length > 0) {
      extractPaletteFromImage(initialItems[0].url, false);
    }

    // 2. CONCURRENT BACKGROUND PROCESSING (Out-of-band)
    filesToUpload.forEach(async ({ file, clientKey, objectUrl }) => {
      try {
        const uploadFile = await compressImageOnClient(file);
        const formData = new FormData();
        formData.append("file", uploadFile);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to upload ${file.name}`);
        }

        const data = await res.json();

        // If returned ready immediately
        if (data.status === "READY" && data.url) {
          setMediaList((prev) =>
            prev.map((item) =>
              item.clientKey === clientKey
                ? {
                    ...item,
                    url: data.url,
                    width: typeof data.width === "number" ? data.width : item.width,
                    height: typeof data.height === "number" ? data.height : item.height,
                    aspectRatio: typeof data.aspectRatio === "number" ? data.aspectRatio : item.aspectRatio,
                    blurhash: data.blurhash,
                    status: "ready",
                  }
                : item
            )
          );
          URL.revokeObjectURL(objectUrl);
          return;
        }

        // Set status to optimizing/processing
        setMediaList((prev) =>
          prev.map((item) =>
            item.clientKey === clientKey
              ? { ...item, status: "processing" }
              : item
          )
        );

        // Background poll status API until READY
        if (data.mediaId) {
          let attempts = 0;
          const maxAttempts = 40;
          while (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 600));
            attempts++;

            try {
              const statusRes = await fetch(`/api/media/${data.mediaId}/status`);
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.status === "READY" && statusData.url) {
                  setMediaList((prev) =>
                    prev.map((item) =>
                      item.clientKey === clientKey
                        ? {
                            ...item,
                            url: statusData.url,
                            width: typeof statusData.width === "number" ? statusData.width : item.width,
                            height: typeof statusData.height === "number" ? statusData.height : item.height,
                            aspectRatio: typeof statusData.aspectRatio === "number" ? statusData.aspectRatio : item.aspectRatio,
                            blurhash: statusData.blurhash,
                            status: "ready",
                          }
                        : item
                    )
                  );
                  URL.revokeObjectURL(objectUrl);
                  break;
                }
                if (statusData.status === "FAILED") {
                  throw new Error(statusData.errorMessage || "Image optimization failed");
                }
              }
            } catch (pollErr) {
              if (attempts >= maxAttempts) throw pollErr;
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setMediaList((prev) =>
          prev.map((item) =>
            item.clientKey === clientKey
              ? { ...item, status: "error", errorMessage: msg }
              : item
          )
        );
        toast.error(`Upload error for ${file.name}: ${msg}`);
      }
    });
  };

  // Handle local file input change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
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
      processFiles(e.dataTransfer.files);
    }
  };

  // Handle adding direct image URL
  const handleAddImageUrl = async () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast.error("Please enter a valid HTTP or HTTPS image URL");
      return;
    }

    if (mediaList.length >= 10) {
      toast.error("Maximum 10 images reached");
      return;
    }

    setUploading(true);
    try {
      const dimensions = await measureImage(url);
      setMediaList((prev) => [
        ...prev,
        {
          clientKey: `url-${Date.now()}`,
          url,
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: dimensions.aspectRatio,
          status: "ready",
        },
      ]);
      if (palette.length === 0) {
        extractPaletteFromImage(url, false);
      }
      setImageUrlInput("");
      toast.success("Visual asset attached");
    } catch {
      toast.error("Could not load image dimensions from URL");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    const item = mediaList[index];
    if (item?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const moveMedia = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mediaList.length) return;

    setMediaList((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Specs helper
  const addSpecField = () => {
    if (specs.length < 8) {
      setSpecs((prev) => [...prev, { key: "", value: "" }]);
    }
  };

  const updateSpec = (index: number, field: "key" | "value", val: string) => {
    setSpecs((prev) => {
      const next = [...prev];
      next[index][field] = val;
      return next;
    });
  };

  const removeSpec = (index: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickSpec = (key: string) => {
    const emptyIndex = specs.findIndex((s) => !s.key.trim());
    if (emptyIndex !== -1) {
      updateSpec(emptyIndex, "key", key);
    } else if (specs.length < 8) {
      setSpecs((prev) => [...prev, { key, value: "" }]);
    }
  };

  // Submit Drop
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSpaceId) {
      toast.error("Please select a destination Space");
      return;
    }

    if (!title.trim() || title.trim().length < 2) {
      toast.error("Please provide a title with at least 2 characters");
      return;
    }

    if (mediaList.length === 0) {
      toast.error("Please add at least one image to your Drop");
      return;
    }

    setPublishing(true);

    try {
      // 1. Check if any visual assets are still uploading or optimizing
      let currentMedia = mediaListRef.current;
      const isPending = () =>
        currentMedia.some((m) => m.status === "uploading" || m.status === "processing");

      if (isPending()) {
        toast.info("Finalizing visual assets, publishing shortly...");
        let attempts = 0;
        while (attempts < 30 && isPending()) {
          await new Promise((r) => setTimeout(r, 500));
          attempts++;
          currentMedia = mediaListRef.current;
        }
      }

      if (isPending()) {
        toast.error("Visual assets are still optimizing. Please wait a moment and try again.");
        return;
      }

      const hasFailed = currentMedia.some((m) => m.status === "error");
      if (hasFailed) {
        toast.error("Some images failed to optimize. Please remove or replace them before publishing.");
        return;
      }

      // 2. Prepare clean payload for action
      const cleanMedia: DropMediaInput[] = currentMedia.map((m) => ({
        url: m.url,
        width: m.width,
        height: m.height,
        aspectRatio: m.aspectRatio,
        blurhash: m.blurhash,
      }));

      // Build specs dictionary
      const specsObj: Record<string, string> = {};
      for (const s of specs) {
        if (s.key.trim() && s.value.trim()) {
          specsObj[s.key.trim()] = s.value.trim();
        }
      }

      const res = await createDrop({
        spaceId: selectedSpaceId,
        title: title.trim(),
        content: content.trim() || undefined,
        locationName: locationName.trim() || undefined,
        specs: Object.keys(specsObj).length > 0 ? specsObj : undefined,
        palette: palette.length > 0 ? palette : undefined,
        media: cleanMedia,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to publish Drop");
        return;
      }

      toast.success("Drop published successfully!");
      if (res.dropId) {
        router.push(`/drop/${res.dropId}`);
      } else if (res.spaceSlug) {
        router.push(`/s/${res.spaceSlug}`);
      } else {
        router.push("/explore");
      }
    } catch {
      toast.error("Unexpected error publishing Drop");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="max-w-5xl mx-auto px-4 sm:px-6 py-8"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Contribute Visual Inspiration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Create a Drop
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Publish authentic visual craft, equipment specs, and context into
            your chosen Space.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Media Upload & Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 backdrop-blur-xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground">
                  1. Visual Assets ({mediaList.length}/10)
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-muted-foreground">
                  Aspect ratio preserved automatically
                </span>
              </div>

              {/* Dropzone Area with Drag & Drop */}
              {(() => {
                const isAnyProcessing = mediaList.some(
                  (m) => m.status === "uploading" || m.status === "processing"
                );
                return (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group ${
                      isDragging
                        ? "border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]"
                        : "border-zinc-300 dark:border-border/80 hover:border-zinc-500 dark:hover:border-foreground/40 bg-zinc-50/60 dark:bg-secondary/30"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all duration-200 shadow-inner ${
                        isDragging
                          ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                          : "bg-zinc-100 dark:bg-secondary text-zinc-500 dark:text-muted-foreground group-hover:text-zinc-900 dark:group-hover:text-foreground"
                      }`}
                    >
                      {isAnyProcessing ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : (
                        <UploadCloud
                          className={`w-6 h-6 ${isDragging ? "animate-bounce" : ""}`}
                        />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-foreground">
                      {isDragging
                        ? "Thả ảnh vào đây để tải lên ngay!"
                        : isAnyProcessing
                        ? "Đang tối ưu hóa hình ảnh ngầm..."
                        : "Tải lên hình ảnh (Visual assets)"}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-muted-foreground mt-1">
                      {isDragging
                        ? "Hỗ trợ thả nhiều ảnh cùng lúc"
                        : "Kéo thả hoặc bấm để chọn ảnh (Xem trước tức thì • JPEG, PNG, WebP, GIF)"}
                    </p>
                  </div>
                );
              })()}

              {/* URL Input Bar */}
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-border/50">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-muted-foreground" />
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Or paste an image URL (Unsplash, etc.)..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-secondary/50 border border-zinc-200 dark:border-border/70 text-zinc-900 dark:text-foreground placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    disabled={uploading || !imageUrlInput.trim()}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-secondary dark:hover:bg-secondary/80 text-zinc-900 dark:text-foreground border border-zinc-200 dark:border-border/80 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Attach
                  </button>
                </div>
              </div>

              {/* Uploaded Media Previews with Aspect Ratio Display */}
              {mediaList.length > 0 && (
                <div className="mt-6 space-y-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Visual Assets ({mediaList.length}/10)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaList.map((m, idx) => (
                      <div
                        key={m.clientKey || idx}
                        className="group relative rounded-xl overflow-hidden border border-border/70 bg-card shadow-sm flex flex-col"
                      >
                        {/* Frame container: uniform 4:3 aspect ratio so every card is identical and filled */}
                        <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900/60 flex items-center justify-center">
                          {/* Ambient blurred backdrop to gracefully fill any edge cases */}
                          <img
                            src={m.url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                          />
                          {/* Main image: fits edge-to-edge with object-cover */}
                          <img
                            src={m.url}
                            alt={`Uploaded asset ${idx + 1}`}
                            className="relative w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-background/80 backdrop-blur-md text-foreground">
                            #{idx + 1}
                          </div>

                          {/* Status Badge */}
                          {m.status && m.status !== "ready" && (
                            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-medium bg-background/90 text-foreground backdrop-blur-md flex items-center gap-1.5 shadow-sm border border-border/40">
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                              <span>{m.status === "uploading" ? "Uploading..." : "Optimizing..."}</span>
                            </div>
                          )}
                          {m.status === "ready" && (
                            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                              <Check className="w-2.5 h-2.5" />
                              <span>Ready</span>
                            </div>
                          )}
                          {m.status === "error" && (
                            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-rose-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                              <X className="w-2.5 h-2.5" />
                              <span>Failed</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground transition-colors cursor-pointer"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="p-2 bg-card text-[10px] text-muted-foreground flex items-center justify-between border-t border-border/50">
                          <span className="truncate mr-1 font-mono">
                            {m.width > 0 && m.height > 0 ? `${m.width}×${m.height}` : "..."} ({m.aspectRatio || "auto"})
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveMedia(idx, "up")}
                              className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 cursor-pointer"
                              title="Move left"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === mediaList.length - 1}
                              onClick={() => moveMedia(idx, "down")}
                              className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 cursor-pointer"
                              title="Move right"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Metadata & Destination (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-zinc-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 backdrop-blur-xl p-5 sm:p-6 shadow-xs space-y-5">
              {/* Space Picker */}
              <div className="relative">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground block mb-2">
                  Destination Space *
                </label>

                {(() => {
                  const currentSpace = availableSpaces.find((s) => s.id === selectedSpaceId);
                  return (
                    <>
                      {currentSpace ? (
                        <button
                          type="button"
                          onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
                          className="w-full p-2.5 rounded-2xl border border-zinc-200/90 dark:border-border/80 bg-zinc-100/80 hover:bg-zinc-200/70 dark:bg-secondary/70 dark:hover:bg-secondary/90 backdrop-blur-md flex items-center justify-between transition-all cursor-pointer group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted shrink-0 border border-zinc-200 dark:border-border/60">
                              <img
                                src={currentSpace.coverImageUrl}
                                alt={currentSpace.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div className="min-w-0 truncate">
                              <div className="text-xs font-bold text-zinc-900 dark:text-foreground truncate flex items-center gap-1.5">
                                <span>{currentSpace.name}</span>
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-muted-foreground uppercase tracking-wider font-semibold">
                                {currentSpace.category} &bull; {spaceContext(currentSpace)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pl-2">
                            <span className="hidden sm:inline text-[11px]">
                              Change
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isSpaceMenuOpen
                                  ? "rotate-180 text-foreground"
                                  : ""
                              }`}
                            />
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
                          className="w-full p-3 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-border/80 hover:border-zinc-500 dark:hover:border-foreground/40 bg-zinc-50/60 dark:bg-secondary/30 backdrop-blur-md flex items-center justify-between transition-all cursor-pointer group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-secondary flex items-center justify-center text-zinc-500 dark:text-muted-foreground shrink-0 border border-zinc-200 dark:border-border/60">
                              <Compass className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-900 dark:text-foreground">
                                Select a Space *
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-muted-foreground">
                                Search existing spaces or create a new one
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pl-2">
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isSpaceMenuOpen
                                  ? "rotate-180 text-foreground"
                                  : ""
                              }`}
                            />
                          </div>
                        </button>
                      )}

                      {isSpaceMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30 bg-black/10 dark:bg-black/50 backdrop-blur-xs transition-opacity"
                            onClick={() => {
                              setIsSpaceMenuOpen(false);
                              setSpaceSearchQuery("");
                            }}
                          />
                          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-xl dark:shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
                            {/* Search Bar Input */}
                            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-muted-foreground pointer-events-none" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={spaceSearchQuery}
                                  onChange={(e) =>
                                    setSpaceSearchQuery(e.target.value)
                                  }
                                  placeholder="Search spaces by name, category..."
                                  className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-zinc-200 dark:border-border/70 bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-foreground text-xs placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {spaceSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setSpaceSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Filtered Spaces List */}
                            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                              {(() => {
                                const filteredSpaces = availableSpaces.filter((s) => {
                                  if (!spaceSearchQuery.trim()) return true;
                                  const q = spaceSearchQuery
                                    .toLowerCase()
                                    .trim();
                                  return (
                                    s.name.toLowerCase().includes(q) ||
                                    s.category.toLowerCase().includes(q) ||
                                    s.slug.toLowerCase().includes(q) ||
                                    (s.ownerName || "").toLowerCase().includes(q)
                                  );
                                });

                                if (filteredSpaces.length === 0) {
                                  return (
                                    <div className="py-6 px-3 text-center">
                                      <p className="text-xs font-medium text-zinc-500 dark:text-muted-foreground">
                                        No spaces matching &quot;
                                        {spaceSearchQuery}&quot;
                                      </p>
                                    </div>
                                  );
                                }

                                return filteredSpaces.map((s) => {
                                  const isSelected = s.id === selectedSpaceId;
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSpaceId(s.id);
                                        setIsSpaceMenuOpen(false);
                                        setSpaceSearchQuery("");
                                      }}
                                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs border border-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-50 dark:border-transparent"
                                          : "hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-950 dark:hover:bg-zinc-800/60 dark:text-zinc-400 dark:hover:text-zinc-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                          src={s.coverImageUrl}
                                          alt={s.name}
                                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-border/50"
                                        />
                                        <div className="truncate">
                                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                            {s.name}
                                          </div>
                                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                                            {s.category} &bull; {spaceContext(s)}
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                                      )}
                                    </button>
                                  );
                                });
                              })()}
                            </div>

                            {/* Quick Create Space Action */}
                            <div className="p-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSpaceMenuOpen(false);
                                  setSpaceSearchQuery("");
                                  setIsCreateSpaceModalOpen(true);
                                }}
                                className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Create new Space</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground block mb-2">
                  Drop Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your visual Drop an evocative title..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-border/80 bg-zinc-50/60 dark:bg-card text-zinc-900 dark:text-foreground text-sm placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                />
              </div>

              {/* Story / Narrative */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground block mb-2">
                  Story / Visual Context (Optional)
                </label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share the process, atmosphere, technique, or background..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-border/80 bg-zinc-50/60 dark:bg-card text-zinc-900 dark:text-foreground text-sm placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-foreground/20 resize-none leading-relaxed"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-muted-foreground" />
                  <span>Location (Optional)</span>
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Ba Dinh, Hanoi or Shinjuku, Tokyo"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-border/80 bg-zinc-50/60 dark:bg-card text-zinc-900 dark:text-foreground text-xs placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                />
              </div>

              {/* Aesthetic Color Palette */}
              <div className="pt-3 border-t border-zinc-100 dark:border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-500" />
                    <span>Aesthetic Palette (Optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {mediaList.length > 0 && (
                      <button
                        type="button"
                        disabled={extractingPalette}
                        onClick={() =>
                          extractPaletteFromImage(mediaList[0].url, true)
                        }
                        className="text-[11px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
                        title="Auto-extract dominant colors from first image"
                      >
                        {extractingPalette ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        <span>Extract from photo</span>
                      </button>
                    )}
                    {palette.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPalette([])}
                        className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:text-muted-foreground dark:hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer"
                        title="Clear palette"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Aesthetic Presets */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className="text-[10px] text-zinc-400 dark:text-muted-foreground font-medium mr-1">
                    Presets:
                  </span>
                  {PRESET_PALETTES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setPalette(preset.colors);
                        toast.success(`Applied ${preset.name} palette`);
                      }}
                      className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-secondary hover:bg-zinc-200/80 dark:hover:bg-secondary/80 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      <span className="flex items-center -space-x-1">
                        {preset.colors.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="w-2 h-2 rounded-full border border-white/40 shadow-xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>

                {/* Active Swatches or Empty Hint */}
                {palette.length > 0 ? (
                  <div className="flex items-center gap-2.5 flex-wrap p-2.5 rounded-xl bg-zinc-50/60 dark:bg-secondary/30 border border-zinc-200/80 dark:border-border/60">
                    {palette.map((color, idx) => (
                      <div
                        key={idx}
                        className="relative group flex flex-col items-center"
                      >
                        <label
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/20 shadow-xs cursor-pointer block transition-transform group-hover:scale-105 overflow-hidden ring-1 ring-black/5"
                          style={{ backgroundColor: color }}
                          title="Click to customize color"
                        >
                          <input
                            type="color"
                            value={color}
                            onChange={(e) =>
                              updatePaletteColor(idx, e.target.value)
                            }
                            onInput={(e) =>
                              updatePaletteColor(
                                idx,
                                (e.target as HTMLInputElement).value,
                              )
                            }
                            className="opacity-0 w-full h-full cursor-pointer"
                          />
                        </label>
                        <span className="text-[9px] font-mono text-zinc-500 dark:text-muted-foreground mt-1 uppercase">
                          {color}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePaletteColor(idx)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                          title="Remove color"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {palette.length < 6 && (
                      <button
                        type="button"
                        onClick={addPaletteColor}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-dashed border-zinc-300 dark:border-border hover:border-zinc-500 dark:hover:border-foreground/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start mt-0"
                        title="Add new color (Open color picker immediately)"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-zinc-200 dark:border-border/80 bg-zinc-50/40 dark:bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
                    <p className="text-[11px] text-zinc-500 dark:text-muted-foreground">
                      Upload a photo to auto-extract palette, pick a preset
                      above, or add custom colors.
                    </p>
                    <button
                      type="button"
                      onClick={addPaletteColor}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground text-xs font-semibold border border-border/60 transition-all cursor-pointer shrink-0"
                      title="Add new color"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Add color</span>
                    </button>
                  </div>
                )}

                {/* Dedicated Color Input to immediately trigger native picker on 'addPaletteColor' */}
                <input
                  ref={addColorInputRef}
                  type="color"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const idx = activeColorIndexRef.current;
                    if (idx !== null && idx !== undefined) {
                      updatePaletteColor(idx, e.target.value);
                    }
                  }}
                  onInput={(e) => {
                    const idx = activeColorIndexRef.current;
                    if (idx !== null && idx !== undefined) {
                      updatePaletteColor(
                        idx,
                        (e.target as HTMLInputElement).value,
                      );
                    }
                  }}
                />
              </div>

              {/* Structured Specifications */}
              <div className="pt-2 border-t border-zinc-100 dark:border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>Technical Specs (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={addSpecField}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground inline-flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add spec</span>
                  </button>
                </div>

                {/* Quick suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {[
                    "Camera",
                    "Lens",
                    "Switches",
                    "Case",
                    "Beans",
                    "Lighting",
                  ].map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => handleQuickSpec(pill)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-secondary text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground cursor-pointer transition-colors"
                    >
                      +{pill}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {specs.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Spec (e.g. Lens)"
                        value={s.key}
                        onChange={(e) => updateSpec(idx, "key", e.target.value)}
                        className="w-1/3 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-border/80 bg-zinc-50/60 dark:bg-secondary/40 text-zinc-900 dark:text-foreground text-xs placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 35mm f/1.4)"
                        value={s.value}
                        onChange={(e) =>
                          updateSpec(idx, "value", e.target.value)
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-border/80 bg-zinc-50/60 dark:bg-secondary/40 text-zinc-900 dark:text-foreground text-xs placeholder:text-zinc-400 dark:placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-foreground/20"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpec(idx)}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-secondary text-zinc-400 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publishing Footer */}
              <div className="pt-4 border-t border-zinc-100 dark:border-border/60">
                <button
                  type="submit"
                  disabled={
                    publishing ||
                    uploading ||
                    mediaList.length === 0 ||
                    !title.trim()
                  }
                  className="w-full py-3 rounded-2xl font-bold text-sm bg-zinc-900 text-white dark:bg-foreground dark:text-background hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing to Space...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Publish Drop</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <CreateSpaceModal
        isOpen={isCreateSpaceModalOpen}
        onClose={() => setIsCreateSpaceModalOpen(false)}
        onSpaceCreated={handleSpaceCreated}
      />
    </>
  );
}
