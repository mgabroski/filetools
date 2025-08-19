import { PDFDocument } from 'pdf-lib';

export async function reorderPdf(
  file: File,
  order: number[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf, { ignoreEncryption: false });
  const total = src.getPageCount();

  const seen = new Set<number>();
  for (const idx of order) {
    if (idx < 0 || idx >= total) throw new Error('Invalid page index.');
    if (seen.has(idx)) throw new Error('Duplicate page index.');
    seen.add(idx);
  }

  const dst = await PDFDocument.create();

  const CHUNK = 50;
  for (let i = 0; i < order.length; i += CHUNK) {
    const batch = order.slice(i, i + CHUNK);
    const copied = await dst.copyPages(src, batch);
    copied.forEach((p) => dst.addPage(p));
    if (onProgress) onProgress(Math.round(((i + batch.length) / order.length) * 100));
  }

  const bytes = await dst.save({ updateFieldAppearances: false });
  return new Blob([bytes], { type: 'application/pdf' });
}
