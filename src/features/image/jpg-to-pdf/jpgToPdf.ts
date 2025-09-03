import { PDFDocument, rgb } from 'pdf-lib';

export type PagePreset = 'auto' | 'A4' | 'Letter';
export type Orientation = 'portrait' | 'landscape';
export type ScaleMode = 'fit' | 'fill';

export type JpgToPdfOptions = {
  preset: PagePreset;
  orientation: Orientation;
  marginMm: number;
  scale: ScaleMode;
  jpegQuality: number;
  backgroundColor?: string;
};

export type JpgToPdfProgress = (pct: number, label?: string) => void;

const MM_TO_PT = 72 / 25.4;
const PAGE_SIZES: Record<'A4' | 'Letter', { w: number; h: number }> = {
  A4: { w: 595.28, h: 841.89 },
  Letter: { w: 612, h: 792 },
};

function getImageDims(img: HTMLImageElement | ImageBitmap): { w: number; h: number } {
  if ('naturalWidth' in img) {
    return { w: img.naturalWidth, h: img.naturalHeight };
  }
  return { w: img.width, h: img.height };
}

async function imageToJpegBytes(
  img: HTMLImageElement | ImageBitmap,
  quality: number,
  bg = '#ffffff'
): Promise<Uint8Array> {
  const { w, h } = getImageDims(img);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('Failed to export JPEG'))),
      'image/jpeg',
      quality
    )
  );
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function resolvePageSize(
  preset: PagePreset,
  orientation: Orientation,
  imgW: number,
  imgH: number,
  marginPt: number
) {
  if (preset === 'auto') {
    const MAX_SIDE = 1440;
    const scale = Math.min(1, MAX_SIDE / Math.max(imgW, imgH));
    return { w: Math.max(72, imgW * scale), h: Math.max(72, imgH * scale), margin: marginPt };
  }
  const base = PAGE_SIZES[preset];
  const w = orientation === 'portrait' ? base.w : base.h;
  const h = orientation === 'portrait' ? base.h : base.w;
  return { w, h, margin: Math.min(marginPt, Math.min(w, h) / 4) };
}

function computeDrawSize(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: ScaleMode
): { w: number; h: number } {
  const scaleFit = Math.min(dstW / srcW, dstH / srcH);
  const scaleCover = Math.max(dstW / srcW, dstH / srcH);
  const s = mode === 'fill' ? scaleCover : scaleFit;
  return { w: srcW * s, h: srcH * s };
}

export async function imagesToPdf(
  files: File[],
  opts: JpgToPdfOptions,
  onProgress?: JpgToPdfProgress
): Promise<Blob> {
  if (!files.length) throw new Error('No images selected.');
  const tick = (p: number, msg?: string) =>
    onProgress?.(Math.round(Math.max(0, Math.min(100, p))), msg);

  tick(3, 'Preparing PDF…');
  const pdf = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const f = files[i];

    const url = URL.createObjectURL(f);
    const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Failed to load image'));
      im.src = url;
    });

    const iw = imgEl.naturalWidth;
    const ih = imgEl.naturalHeight;

    const marginPt = opts.marginMm * MM_TO_PT;
    const {
      w: pageW,
      h: pageH,
      margin,
    } = resolvePageSize(opts.preset, opts.orientation, iw, ih, marginPt);

    const cw = Math.max(1, pageW - margin * 2);
    const ch = Math.max(1, pageH - margin * 2);
    const { w: drawW, h: drawH } = computeDrawSize(iw, ih, cw, ch, opts.scale);

    const bytes = await imageToJpegBytes(
      imgEl,
      opts.jpegQuality,
      opts.backgroundColor ?? '#ffffff'
    );
    const jpg = await pdf.embedJpg(bytes);

    const page = pdf.addPage([pageW, pageH]);
    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: rgb(1, 1, 1) });

    const x = margin + (cw - drawW) / 2;
    const y = margin + (ch - drawH) / 2;
    page.drawImage(jpg, { x, y, width: drawW, height: drawH });

    URL.revokeObjectURL(url);
    tick(5 + ((i + 1) / files.length) * 90, `Placing ${i + 1} / ${files.length}…`);
  }

  tick(97, 'Finalizing…');
  const out = await pdf.save({ useObjectStreams: true });
  tick(100, 'Done');
  return new Blob([out], { type: 'application/pdf' });
}
