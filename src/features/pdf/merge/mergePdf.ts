import { PDFDocument } from 'pdf-lib';

export async function mergePdf(files: File[], onProgress?: (pct: number) => void): Promise<Blob> {
  const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
  const docs = await Promise.all(
    buffers.map((b) => PDFDocument.load(new Uint8Array(b), { ignoreEncryption: true }))
  );

  const merged = await PDFDocument.create();
  const totalPages = docs.reduce((s, d) => s + d.getPageCount(), 0) || 1;
  let processed = 0;
  onProgress?.(0);

  for (const doc of docs) {
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const p of pages) {
      merged.addPage(p);
      processed += 1;
      onProgress?.(Math.round((processed / totalPages) * 100));
    }
  }

  const out = await merged.save({ addDefaultPage: false });
  return new Blob([out], { type: 'application/pdf' });
}
