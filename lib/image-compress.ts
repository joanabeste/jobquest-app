/**
 * Client-side image compression. Resizes large images and re-encodes as JPEG
 * to fit within Vercel's 4.5 MB function payload limit.
 *
 * Use `preserveFormat: true` for text-heavy images (e.g., Excel screenshots
 * destined for the KI vision pipeline) — PNG sources stay PNG, JPEG stays
 * JPEG at q=0.95, and max dimensions grow to 2560.
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxBytes?: number;
    preserveFormat?: boolean;
  } = {},
): Promise<File> {
  const preserveFormat = options.preserveFormat === true;
  const maxWidth  = options.maxWidth  ?? (preserveFormat ? 2560 : 1920);
  const maxHeight = options.maxHeight ?? (preserveFormat ? 2560 : 1920);
  const quality   = options.quality   ?? (preserveFormat ? 0.95 : 0.85);
  const maxBytes  = options.maxBytes  ?? 4 * 1024 * 1024; // 4 MB safety margin

  const keepAsPng = preserveFormat && file.type === 'image/png';

  // Skip if already small enough and not absurdly large in dimensions
  if (file.size <= maxBytes && file.type !== 'image/heic') {
    const dims = await getDimensions(file);
    if (dims.width <= maxWidth && dims.height <= maxHeight) return file;
  }

  // Load image
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  URL.revokeObjectURL(url);

  // Compute target dimensions preserving aspect ratio
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width  = Math.round(width  * ratio);
    height = Math.round(height * ratio);
  }

  // Render to canvas
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  if (keepAsPng) {
    const blob = await canvasToBlob(canvas, 1, 'image/png');
    if (!blob) throw new Error('Bild konnte nicht komprimiert werden');
    return new File([blob], file.name, { type: 'image/png' });
  }

  // Re-encode as JPEG. Drop quality progressively if still too large — but
  // when preserveFormat is set, keep a higher floor to protect text fidelity.
  const minQuality = preserveFormat ? 0.85 : 0.4;
  let q = quality;
  let blob = await canvasToBlob(canvas, q, 'image/jpeg');
  while (blob && blob.size > maxBytes && q > minQuality) {
    q -= 0.1;
    blob = await canvasToBlob(canvas, q, 'image/jpeg');
  }
  if (!blob) throw new Error('Bild konnte nicht komprimiert werden');

  const newName = file.name.replace(/\.(heic|heif|png|webp|tiff?)$/i, '.jpg');
  return new File([blob], newName.endsWith('.jpg') ? newName : `${newName}.jpg`, { type: 'image/jpeg' });
}

function getDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number, mime: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), mime, quality));
}
