import { PDFDocument } from 'pdf-lib';
import { getDocument, type PDFPageProxy } from 'pdfjs-dist';

export type CompressOptions = {
  dpi: number;
  quality: number;
  onProgress?: (pct: number) => void;
};

/** Convert a dataURL to its base64 string (strip the prefix). */
function dataUrlToBase64(dataUrl: string) {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/** Render one PDF page to a canvas at a given DPI and return JPEG dataURL. */
async function renderPageToJpeg(
  page: PDFPageProxy,
  dpi: number,
  quality: number
): Promise<{ dataUrl: string; pxW: number; pxH: number }> {
  const scale = dpi / 96;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, pxW: canvas.width, pxH: canvas.height };
}

/**
 * Compress a PDF by rasterizing pages to JPEG at (dpi, quality).
 * Returns a Blob of the new PDF. Calls onProgress(0..100).
 */
export async function compressPdf(file: File, opt: CompressOptions): Promise<Blob> {
  const { dpi, quality, onProgress } = opt;
  onProgress?.(0);

  const data = await file.arrayBuffer();
  const src = await getDocument({ data }).promise;
  const pageCount = src.numPages;

  const out = await PDFDocument.create();

  // convert px to PDF points (72 pt/in vs 96 px/in)
  const PX_TO_PT = 72 / 96;

  for (let i = 1; i <= pageCount; i++) {
    const page = await src.getPage(i);
    const { dataUrl, pxW, pxH } = await renderPageToJpeg(page, dpi, quality);
    const base64 = dataUrlToBase64(dataUrl);
    const jpg = await out.embedJpg(base64);

    const pageWidthPt = pxW * PX_TO_PT;
    const pageHeightPt = pxH * PX_TO_PT;

    const p = out.addPage([pageWidthPt, pageHeightPt]);
    p.drawImage(jpg, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
    });

    onProgress?.(Math.round((i / pageCount) * 100));
  }

  const bytes = await out.save({ addDefaultPage: false });
  return new Blob([bytes], { type: 'application/pdf' });
}
