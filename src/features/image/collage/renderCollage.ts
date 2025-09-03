import type { CollageOptions, FitMode } from './collage';
import { ASPECTS, gridForTemplate } from './templates';

type Img = { bmp: ImageBitmap; w: number; h: number };

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(Math.max(r, 0), Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Symmetric dual-lobe heart
  const cx = x + w / 2;
  const top = y + h * 0.28;
  const left = x + w * 0.1;
  const right = x + w * 0.9;
  const bottom = y + h * 0.95;

  ctx.beginPath();
  ctx.moveTo(cx, bottom);
  ctx.bezierCurveTo(x - w * 0.05, y + h * 0.7, left, y + h * 0.35, cx, top);
  ctx.bezierCurveTo(right, y + h * 0.35, x + w * 1.05, y + h * 0.7, cx, bottom);
  ctx.closePath();
}

async function toBitmaps(files: File[]): Promise<Img[]> {
  const arr: Img[] = [];
  for (const f of files) {
    const bmp = await createImageBitmap(f);
    arr.push({ bmp, w: bmp.width, h: bmp.height });
  }
  return arr;
}

function drawFitted(
  ctx: CanvasRenderingContext2D,
  img: Img,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: FitMode
) {
  const s = fit === 'fill' ? Math.max(w / img.w, h / img.h) : Math.min(w / img.w, h / img.h);
  const dw = img.w * s;
  const dh = img.h * s;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img.bmp, dx, dy, dw, dh);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg',
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
        type,
        quality
      );
    } else {
      try {
        const dataUrl = canvas.toDataURL(type, quality);
        fetch(dataUrl)
          .then((r) => r.blob())
          .then(resolve, reject);
      } catch (e) {
        reject(e as Error);
      }
    }
  });
}

/** Compose a collage and return a Blob (never a string). */
export async function renderCollage(files: File[], opt: CollageOptions): Promise<Blob> {
  const {
    outputWidth,
    aspect,
    spacing,
    cornerRadius,
    bg,
    fit,
    template,
    format,
    quality,
    fillPolicy,
    onProgress,
  } = opt;

  const imgs = await toBitmaps(files);
  onProgress?.(6);

  const ratio = ASPECTS[aspect];
  const W = Math.max(320, Math.round(outputWidth));
  const H = Math.round(W / ratio);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = bg || '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const { rows, cols } = gridForTemplate(template, imgs.length);

  const outerPad = spacing;
  const gap = spacing;

  const stageX = outerPad;
  const stageY = outerPad;
  const stageW = W - outerPad * 2;
  const stageH = H - outerPad * 2;

  const cellW = (stageW - gap * (cols - 1)) / cols;
  const cellH = (stageH - gap * (rows - 1)) / rows;

  if (template === 'heart') {
    ctx.save();
    heartPath(ctx, stageX, stageY, stageW, stageH);
    ctx.clip();
  }

  const cells = rows * cols;
  for (let i = 0; i < cells; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = stageX + c * (cellW + gap);
    const y = stageY + r * (cellH + gap);

    // Select image (blank vs repeat policy)
    let img: Img | null = null;
    if (imgs.length) {
      if (i < imgs.length) img = imgs[i];
      else if (fillPolicy === 'repeat') img = imgs[i % imgs.length];
      else img = null;
    }

    roundRectPath(ctx, x, y, cellW, cellH, cornerRadius);
    ctx.save();
    ctx.clip();
    if (img) drawFitted(ctx, img, x, y, cellW, cellH, fit);
    ctx.restore();

    if ((i & 3) === 0) onProgress?.(6 + Math.round(((i + 1) / cells) * 88));
  }

  if (template === 'heart') ctx.restore();

  const blob = await canvasToBlob(canvas, format, format === 'image/jpeg' ? quality : undefined);

  imgs.forEach((im) => im.bmp.close?.());
  onProgress?.(100);
  return blob;
}
