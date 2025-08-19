import { PDFDocument, degrees } from 'pdf-lib';
import { parseRanges } from '../split/splitPdf';

export type RotateOptions = {
  angle: 90 | 180 | 270;
  ranges?: string;
  onProgress?: (pct: number) => void;
};

export async function rotatePdf(file: File, opts: RotateOptions): Promise<Blob> {
  const { angle, ranges, onProgress } = opts;

  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: false });
  const total = doc.getPageCount();

  const selected =
    ranges && ranges.trim().length > 0
      ? Array.from(parseRanges(ranges, total))
          .sort((a, b) => a - b)
          .map((n) => n - 1)
      : Array.from({ length: total }, (_, i) => i);

  if (selected.length === 0) throw new Error('No valid pages selected.');

  for (let i = 0; i < selected.length; i++) {
    const pageIndex = selected[i];
    const page = doc.getPage(pageIndex);
    const current = page.getRotation().angle || 0;
    page.setRotation(degrees((current + angle) % 360));

    if (onProgress) onProgress(Math.round(((i + 1) / selected.length) * 100));
  }

  const out = await doc.save({ updateFieldAppearances: false });
  return new Blob([out], { type: 'application/pdf' });
}
