import { MAX_IMAGE_SIDE, pixelsFromRGBA, type Pixels } from './importImage';

/** The picture's pixels, read from a canvas. */
export function canvasPixels(canvas: HTMLCanvasElement): Pixels {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return pixelsFromRGBA(d, canvas.width, canvas.height);
}

async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Some formats (like SVG) only open through an <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Opens a picture file on a white canvas, scaled down to at most 3200 pixels on its longer side.
 * Throws if the file isn't a picture the browser can open.
 */
export async function loadImageFile(file: Blob): Promise<{ canvas: HTMLCanvasElement; pixels: Pixels }> {
  const img = await decode(file);
  let w = img.width;
  let h = img.height;
  if (!w || !h) throw new Error('empty picture');
  if (Math.max(w, h) > MAX_IMAGE_SIDE) {
    const k = MAX_IMAGE_SIDE / Math.max(w, h);
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  if ('close' in img && typeof img.close === 'function') img.close();
  return { canvas, pixels: canvasPixels(canvas) };
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}
