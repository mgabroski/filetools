import { PDFDocument } from 'pdf-lib';

/** Merge multiple PDF files into one PDF Blob. */
export async function mergePdf(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  const out = await merged.save({ addDefaultPage: false });
  return new Blob([out], { type: 'application/pdf' });
}
