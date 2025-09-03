export type ImageCompressPreset = 'email' | 'web' | 'high' | 'custom';

export type ImageCompressOptions = {
  preset: ImageCompressPreset;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format: 'auto' | 'image/jpeg' | 'image/png';
  keepTransparency: boolean;
};

type CanvasLike = OffscreenCanvas | HTMLCanvasElement;

const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
const makeCanvas = (w: number, h: number): CanvasLike =>
  hasOffscreen
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });

function get2d(c: CanvasLike): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D {
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (c instanceof HTMLCanvasElement) {
    ctx = c.getContext('2d', { alpha: true });
  } else {
    ctx = c.getContext('2d', { alpha: true });
  }
  if (!ctx) throw new Error('Canvas 2D not supported');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

const toBlobFromCanvas = (c: CanvasLike, type: string, quality?: number): Promise<Blob> => {
  if (c instanceof OffscreenCanvas) return c.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    (c as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      type,
      quality
    )
  );
};

function fit(w: number, h: number, maxW?: number, maxH?: number) {
  if (!maxW && !maxH) return { w, h };
  const r = Math.min(maxW ? maxW / w : 1, maxH ? maxH / h : 1, 1);
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}

function detectAlpha(c: CanvasLike): boolean {
  const sw = Math.min(64, c.width);
  const sh = Math.min(64, c.height);
  const tmp = makeCanvas(sw, sh);
  const tctx = get2d(tmp);
  tctx.drawImage(c as unknown as CanvasImageSource, 0, 0, sw, sh);
  const { data } = tctx.getImageData(0, 0, sw, sh);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

async function decode(
  file: File
): Promise<{ src: CanvasImageSource; w: number; h: number; cleanup: () => void }> {
  try {
    const bmp = await createImageBitmap(file);
    return { src: bmp, w: bmp.width, h: bmp.height, cleanup: () => bmp.close?.() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error('Image load failed'));
      el.src = url;
    });
    return {
      src: img,
      w: img.naturalWidth,
      h: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  }
}

function resolveQuality(preset: ImageCompressPreset, q: number) {
  if (preset === 'email') return 0.6;
  if (preset === 'web') return 0.75;
  if (preset === 'high') return 0.9;
  return Math.min(0.95, Math.max(0.5, q || 0.85));
}

function chooseFormat(
  req: ImageCompressOptions['format'],
  hasAlpha: boolean,
  keepAlpha: boolean
): 'image/png' | 'image/jpeg' {
  if (req === 'image/png') return 'image/png';
  if (req === 'image/jpeg') return 'image/jpeg';
  return hasAlpha && keepAlpha ? 'image/png' : 'image/jpeg';
}

export type SingleResult = {
  blob: Blob;
  mime: string;
  bytes: number;
  width: number;
  height: number;
};

export async function compressOneImage(
  file: File,
  opt: ImageCompressOptions
): Promise<SingleResult> {
  const d = await decode(file);
  const { w, h } = fit(d.w, d.h, opt.maxWidth, opt.maxHeight);

  const canvas = makeCanvas(w, h);
  const ctx = get2d(canvas);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(d.src, 0, 0, w, h);

  const alpha = detectAlpha(canvas);
  const fmt = chooseFormat(opt.format, alpha, opt.keepTransparency);
  const quality = resolveQuality(opt.preset, opt.quality);

  if (fmt === 'image/jpeg') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const blob = await toBlobFromCanvas(canvas, fmt, quality);

  d.cleanup();
  return { blob, mime: fmt, bytes: blob.size, width: w, height: h };
}
