import { PDFDocument } from 'pdf-lib';

export type SplitOptions = {
  ranges: string;
  onProgress?: (pct: number) => void;
};

export function parseRanges(input: string, totalPages: number): Set<number> {
  const pages = new Set<number>();
  if (!input.trim()) return pages;

  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)?\s*-\s*(\d+)?$/);
    if (!m) {
      const n = Number(part);
      if (Number.isInteger(n) && n >= 1 && n <= totalPages) pages.add(n);
      continue;
    }
    const [, a, b] = m;
    const start = a ? Math.max(1, Math.min(totalPages, Number(a))) : 1;
    const end = b ? Math.max(1, Math.min(totalPages, Number(b))) : totalPages;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    for (let i = lo; i <= hi; i++) pages.add(i);
  }
  return pages;
}

export async function splitPdf(file: File, opts: SplitOptions): Promise<Blob> {
  const { ranges, onProgress } = opts;

  const srcArrayBuf = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(srcArrayBuf, { ignoreEncryption: false });
  const totalPages = srcDoc.getPageCount();

  const pageSet = parseRanges(ranges, totalPages);
  if (pageSet.size === 0) throw new Error('No valid pages selected.');

  const keep = Array.from(pageSet).sort((a, b) => a - b);
  const dstDoc = await PDFDocument.create();

  const chunkSize = 50;
  for (let i = 0; i < keep.length; i += chunkSize) {
    const batch = keep.slice(i, i + chunkSize).map((n) => n - 1);
    const copied = await dstDoc.copyPages(srcDoc, batch);
    copied.forEach((p) => dstDoc.addPage(p));
    if (onProgress) onProgress(Math.round(((i + batch.length) / keep.length) * 100));
  }

  const out = await dstDoc.save({ updateFieldAppearances: false });
  return new Blob([out], { type: 'application/pdf' });
}
