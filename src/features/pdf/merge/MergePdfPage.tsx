import { useEffect, useMemo, useState } from 'react';
import { mergePdf } from './mergePdf';
import { downloadBlob } from '../../../utils/download';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { GripVertical, X } from 'lucide-react';
import { SeoHead } from '../../../components/seo/SeoHead';

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const SITE_URL = (import.meta.env.VITE_SITE_URL as string) || 'https://filetools-eight.vercel.app';

type Picked = {
  file: File;
  id: string;
  /** undefined = not rendered yet; string = dataURL; null = failed */
  thumb?: string | null;
};

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2);
}
function move<T>(arr: T[], from: number, to: number) {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
async function renderThumb(file: File, targetWidth = 72): Promise<string | null> {
  try {
    const data = await file.arrayBuffer();
    const pdf = await getDocument({ data }).promise;
    const page = await pdf.getPage(1);

    const vp = page.getViewport({ scale: 1 });
    const scale = targetWidth / vp.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const url = canvas.toDataURL('image/png');
    page.cleanup?.();
    pdf.cleanup?.();
    return url;
  } catch {
    return null;
  }
}

export default function MergePdfPage() {
  const [files, setFiles] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const totalBytes = useMemo(() => files.reduce((s, p) => s + p.file.size, 0), [files]);
  const canMerge = files.length >= 2 && !busy;

  // Prevent browser from opening dropped files
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const dropped = Array.from(e.dataTransfer?.files ?? []) as File[];
      if (dropped.length) {
        e.preventDefault();
        addFiles(dropped);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  /** Deterministic thumbnail rendering: only render where thumb === undefined */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = files.map((p, i) => ({ p, i })).filter(({ p }) => p.thumb === undefined);

      for (const { p } of pending) {
        const url = await renderThumb(p.file);
        if (cancelled) return;
        setFiles((prev) => {
          // guard against index drift
          const idx = prev.findIndex((x) => x.id === p.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...prev[idx], thumb: url };
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  /** Append files with validation */
  function addFiles(list: File[] | FileList) {
    const incoming = Array.from(list) as File[];
    const rejected: string[] = [];

    setFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        if (!isPdf) {
          rejected.push(`${f.name} (not a PDF)`);
          continue;
        }
        if (f.size > MAX_FILE_BYTES) {
          rejected.push(`${f.name} (> ${formatMB(MAX_FILE_BYTES)} MB)`);
          continue;
        }
        if (next.length >= MAX_FILES) {
          rejected.push(`${f.name} (over file count limit ${MAX_FILES})`);
          continue;
        }
        const projected = next.reduce((s, p) => s + p.file.size, 0) + f.size;
        if (projected > MAX_TOTAL_BYTES) {
          rejected.push(`${f.name} (would exceed total ${formatMB(MAX_TOTAL_BYTES)} MB)`);
          continue;
        }
        const dup = next.find(
          (p) =>
            p.file.name === f.name &&
            p.file.size === f.size &&
            p.file.lastModified === f.lastModified
        );
        if (dup) continue;

        next.push({ file: f, id: crypto.randomUUID(), thumb: undefined });
      }
      return next;
    });

    if (rejected.length) {
      setTimeout(() => {
        alert(
          `Some files were not added:\n\n${rejected.join(
            '\n'
          )}\n\nLimits:\n- Up to ${MAX_FILES} files\n- Each ≤ ${formatMB(
            MAX_FILE_BYTES
          )} MB\n- Total ≤ ${formatMB(MAX_TOTAL_BYTES)} MB`
        );
      }, 0);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files);
    e.currentTarget.value = '';
  }
  function remove(id: string) {
    setFiles((prev) => prev.filter((p) => p.id !== id));
  }

  async function onMerge() {
    try {
      setBusy(true);
      setProgress(0);
      const blob = await mergePdf(
        files.map((f) => f.file),
        (pct) => setProgress(pct)
      );
      downloadBlob(blob, 'merged.pdf');
      setFiles([]); // clear
    } catch (e) {
      console.error(e);
      alert('Failed to merge PDFs. Please try smaller files or fewer at once.');
    } finally {
      setBusy(false);
      setDragIndex(null);
      setDragOverIndex(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page SEO */}
      <SeoHead
        title="Merge PDF Online — Combine PDF Files Free (No Sign-Up, No Watermark) | FileTools"
        description="Merge multiple PDF files into one in your browser. Drag & drop, reorder, and download the combined PDF. Free, fast, and private — files never leave your device. No watermark."
        path="/merge-pdf"
        image="/og/og-merge-pdf.png"
        type="website"
        keywords="merge pdf online, combine pdfs, join pdf files, merge pdf free, merge pdf without watermark, reorder pdf pages, secure pdf merger, private pdf tool"
        jsonLd={[
          // The page itself
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Merge PDF Online',
            url: `${SITE_URL}/merge-pdf`,
            inLanguage: 'en',
            isPartOf: { '@type': 'WebSite', name: 'FileTools', url: `${SITE_URL}/` },
          },
          // Breadcrumbs for richer SERP
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Merge PDF',
                item: `${SITE_URL}/merge-pdf`,
              },
            ],
          },
          // The tool as a free web app
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'FileTools — Merge PDF',
            applicationCategory: 'WebApplication',
            operatingSystem: 'Any',
            url: `${SITE_URL}/merge-pdf`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            featureList: [
              'Drag-and-drop upload',
              'Reorder PDFs before merge',
              'Client-side processing (privacy-first)',
              'No watermark',
            ],
          },
        ]}
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">We are processing your document…</h2>
            <p className="text-center text-sm text-zinc-600 mt-1">Please wait…</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <div className="text-center text-sm mt-2">{progress}%</div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">Merge PDF</h1>
      <p className="text-sm text-zinc-600">
        Merge PDF files online. Drag &amp; drop, reorder, and download a single combined PDF.{' '}
        <span className="font-medium">
          Private by design — all processing happens in your browser. Your files never leave your
          device. No watermark.
        </span>
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Your PDF files</div>
            <label
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm cursor-pointer"
              aria-label="Add PDF files to merge"
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={onPick}
              />
              Add PDFs
            </label>
          </div>
        </CardHeader>

        <CardContent
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
            if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
          }}
          onDrop={(e: React.DragEvent<HTMLDivElement>) => {
            const dropped = Array.from(e.dataTransfer?.files ?? []) as File[];
            if (dropped.length) {
              e.preventDefault();
              addFiles(dropped);
            }
          }}
        >
          {files.length === 0 ? (
            <div
              className="border border-dashed border-zinc-300 rounded-xl p-8 text-center text-sm text-zinc-600"
              onClick={() =>
                document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
              }
              role="button"
              tabIndex={0}
              aria-label="Open file picker to add PDFs"
            >
              Drag &amp; drop PDFs here, or click <span className="underline">Add PDFs</span> to
              upload. Reorder by dragging.
              <div className="mt-2 text-xs text-zinc-500">
                Limits: up to {MAX_FILES} files • each ≤ {formatMB(MAX_FILE_BYTES)} MB • total ≤{' '}
                {formatMB(MAX_TOTAL_BYTES)} MB
              </div>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-zinc-100">
                {files.map((p, i) => (
                  <li
                    key={p.id}
                    className={`py-2 px-1 flex items-center justify-between gap-3 rounded-md ${
                      dragOverIndex === i ? 'bg-zinc-50 ring-1 ring-zinc-200' : ''
                    }`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer!.effectAllowed = 'move';
                      setDragIndex(i);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverIndex !== i) setDragOverIndex(i);
                    }}
                    onDragLeave={() => setDragOverIndex((idx) => (idx === i ? null : idx))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== i) {
                        setFiles((prev) => move(prev, dragIndex, i));
                      }
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                  >
                    {/* left: grip + thumbnail + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical className="size-4 text-zinc-400 shrink-0 cursor-grab" />
                      <div className="w-12 h-16 rounded border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0 grid place-items-center">
                        {p.thumb === undefined ? (
                          <div className="w-8 h-12 rounded bg-zinc-200 animate-pulse" />
                        ) : p.thumb ? (
                          <img src={p.thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-8 h-12 rounded bg-zinc-100" />
                        )}
                      </div>
                      <div className="truncate">{p.file.name}</div>
                    </div>

                    {/* right: size + remove */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-500 tabular-nums w-[68px] text-right">
                        {formatMB(p.file.size)} MB
                      </span>
                      <button
                        onClick={() => remove(p.id)}
                        className="text-xs px-2 py-1 rounded border border-zinc-200 hover:bg-zinc-50 inline-flex items-center gap-1"
                        aria-label={`Remove ${p.file.name}`}
                      >
                        <X className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  Files: {files.length} • Total: {formatMB(totalBytes)} MB • Limits: up to{' '}
                  {MAX_FILES} files, each ≤ {formatMB(MAX_FILE_BYTES)} MB, total ≤{' '}
                  {formatMB(MAX_TOTAL_BYTES)} MB
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiles([])}
                    disabled={busy || files.length === 0}
                    className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={onMerge}
                    disabled={!canMerge}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      canMerge
                        ? 'bg-black text-white'
                        : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {busy ? 'Merging…' : 'Merge PDFs'}
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
