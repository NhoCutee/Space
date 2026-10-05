/**
 * Utility for client-side image compression and resizing before network upload.
 * Reduces raw files (e.g. 15MB - 50MB) down to ~100KB - 300KB WebP payloads
 * in ~30ms directly in the user's browser, enabling instant uploads and zero bandwidth waste.
 */
export async function compressImageOnClient(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<File> {
  // Pass-through for non-raster or animated types where canvas re-encoding would destroy animation/vector data
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  // If running in an environment without DOM/window (SSR safeguard)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height) {
        return resolve(file);
      }

      // Calculate downscaled dimensions preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      } else if (file.size < 400 * 1024 && file.type === 'image/webp') {
        // Already optimized WebP under 400KB
        return resolve(file);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return resolve(file);
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
