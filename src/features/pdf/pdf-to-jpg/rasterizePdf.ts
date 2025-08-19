import { getDocument } from 'pdfjs-dist';

export type RasterizeOptions = {
  dpi: number;
  format: 'jpeg' | 'png';
  quality?: number;
  pageFrom?: number;
  pageTo?: number;
  onProgress?: (percent: number) => void;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/jpeg' | 'image/png',
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
  });
}

/**
 * Rasterize PDF pages to image blobs.
 * Returns an array of { blob, index } preserving page order.
 */
export async function rasterizePdf(
  file: File,
  opts: RasterizeOptions
): Promise<{ blobs: { blob: Blob; index: number }[]; pageCount: number }> {
  const { dpi, format, quality, onProgress } = opts;
  const type = format === 'png' ? 'image/png' : 'image/jpeg';

  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const totalPages = pdf.numPages;

  const from = Math.max(1, opts.pageFrom ?? 1);
  const to = Math.min(totalPages, opts.pageTo ?? totalPages);

  const results: { blob: Blob; index: number }[] = [];
  const scale = dpi / 96;

  for (let i = from; i <= to; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await canvasToBlob(canvas, type, quality);

    // free
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = canvas.height = 0;

    results.push({ blob, index: i });

    if (onProgress) {
      const pct = Math.round(((i - from + 1) / (to - from + 1)) * 100);
      onProgress(pct);
    }
  }

  return { blobs: results, pageCount: totalPages };
}
