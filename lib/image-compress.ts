/**
 * Client-side image compression. Resizes large images and re-encodes as JPEG
 * to fit within Vercel's 4.5 MB function payload limit.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; maxBytes?: number } = {},
): Promise<File> {
  const maxWidth  = options.maxWidth  ?? 1920;
  const maxHeight = options.maxHeight ?? 1920;
  const quality   = options.quality   ?? 0.85;
  const maxBytes  = options.maxBytes  ?? 4 * 1024 * 1024; // 4 MB safety margin

  // Skip if already small enough and not absurdly large in dimensions
  if (file.size <= maxBytes && file.type !== 'image/heic') {
    // We still want to load and check dimensions for very tall/wide screenshots
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

  // Re-encode as JPEG, drop quality progressively if still too large
  let q = quality;
  let blob = await canvasToBlob(canvas, q);
  while (blob && blob.size > maxBytes && q > 0.4) {
    q -= 0.1;
    blob = await canvasToBlob(canvas, q);
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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality));
}
