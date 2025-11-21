import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';
import { reorderPdf } from './reorderPdf';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 400;

function formatMB10(bytes: number) {
  return (bytes / 1_000_000).toFixed(2);
}
function baseName(name: string) {
  return name.replace(/\.pdf$/i, '');
}

type Thumb = { url: string; i: number };

async function renderThumbDataURL(page: unknown, cssWidth = 140): Promise<string> {
  const p = page as {
    getViewport: (arg: { scale: number }) => { width: number; height: number };
    render: (arg: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      canvas: HTMLCanvasElement;
    }) => { promise: Promise<void> };
  };

  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
  const baseVp = p.getViewport({ scale: 1 });
  const scale = (cssWidth * dpr) / baseVp.width;
  const viewport = p.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${Math.round((cssWidth * viewport.height) / viewport.width)}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await p.render({ canvasContext: ctx, viewport, canvas }).promise;

  const url = canvas.toDataURL('image/png');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.height = 0;
  return url;
}

export default function ReorderPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const dragFrom = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const targetRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const canExport = !!file && !!pages && thumbs.length > 0 && !busy;

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const dropped = Array.from(e.dataTransfer?.files ?? []) as File[];
      if (dropped.length) {
        e.preventDefault();
        addFile(dropped[0]);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPages(null);
      setThumbs([]);
      if (!file) return;

      try {
        const buf = await file.arrayBuffer();
        const pdf = await getDocument({ data: buf }).promise;
        const count = pdf.numPages;
        if (!cancelled) setPages(count);
        if (count > MAX_PAGES) alert(`This PDF has ${count} pages. Limit is ${MAX_PAGES}.`);

        const results: Thumb[] = [];
        for (let pageNo = 1; pageNo <= count; pageNo++) {
          try {
            const page = await pdf.getPage(pageNo);
            const url = await renderThumbDataURL(page, 140);
            results.push({ url, i: pageNo - 1 });
          } catch {
            results.push({ url: '', i: pageNo - 1 });
          }
          if (!cancelled) {
            setThumbs(results.slice());
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setPages(null);
          setThumbs([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  function addFile(f: File) {
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      alert('Please choose a PDF file.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      alert(`File is too large. Max ${formatMB10(MAX_FILE_BYTES)} MB.`);
      return;
    }
    setFile(f);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) addFile(f);
    e.currentTarget.value = '';
  }

  function removeAt(index: number) {
    setThumbs((list) => list.filter((_, i) => i !== index));
  }

  function onItemDragStart(index: number) {
    dragFrom.current = index;
    setDraggingIndex(index);
  }
  function onItemDragEnter(index: number) {
    dragOver.current = index;
    setDragOverIndex(index);
  }
  function onItemDragEnd() {
    const from = dragFrom.current;
    const over = dragOver.current;
    dragFrom.current = null;
    dragOver.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
    if (from == null || over == null || from === over) return;

    setThumbs((list) => {
      const next = list.slice();
      const [moved] = next.splice(from, 1);
      next.splice(over, 0, moved);
      return next;
    });
  }
  function onItemDrop(e: React.DragEvent) {
    e.preventDefault();
  }

  function startSmoothProgress() {
    stopSmoothProgress();
    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const target = targetRef.current;
        if (prev >= target) return prev;
        const step = Math.max(1, Math.ceil((target - prev) / 6));
        return Math.min(prev + step, target);
      });
    }, 120);
  }
  function stopSmoothProgress() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function onExport() {
    if (!file) return;
    if (thumbs.length === 0) {
      alert('No pages to export.');
      return;
    }

    setBusy(true);
    setProgress(0);
    targetRef.current = 10;
    startSmoothProgress();

    try {
      const order = thumbs.map((t) => t.i);
      const blob = await reorderPdf(file, order, (p) => {
        targetRef.current = Math.min(100, Math.max(15, Math.round(p)));
      });
      const name = baseName(file.name);
      await downloadBlob(blob, `${name}_reordered_${order.length}p.pdf`);
      targetRef.current = 100;
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Export failed. Please try again.');
    } finally {
      setTimeout(() => {
        stopSmoothProgress();
        setBusy(false);
        // full reset
        setFile(null);
        setPages(null);
        setThumbs([]);
        setProgress(0);
        targetRef.current = 0;
      }, 350);
    }
  }

  const metaLine = useMemo(() => {
    if (!file) return 'No file selected.';
    const sizeMB = formatMB10(file.size);
    const p = pages ?? '…';
    return `${file.name} • ${sizeMB} MB • Pages: ${p}`;
  }, [file, pages]);

  return (
    <div className="space-y-6">
      <SeoHead
        title="Reorder / Delete Pages — Arrange PDF Pages (Free & Private) | FileTools"
        description="Reorder or delete PDF pages with thumbnail previews. Drag and drop to rearrange. Private by design — runs in your browser."
        path="/reorder-pdf"
        image="/og/og-reorder-pdf.png"
        type="website"
        keywords="reorder pdf pages, remove pdf pages, delete pdf pages, rearrange pdf online"
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">Building your PDF…</h2>
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

      <h1 className="text-2xl font-bold">Reorder / Delete Pages</h1>
      <p className="text-sm text-zinc-600">
        Drag and drop pages to rearrange them, or remove pages you don’t need. Everything runs
        locally in your browser.
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Upload</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm cursor-pointer">
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={onPick}
              />
              Choose PDF
            </label>
          </div>
        </CardHeader>

        <CardContent
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
            if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
          }}
          onDrop={(e: React.DragEvent<HTMLDivElement>) => {
            const f = (e.dataTransfer?.files?.[0] as File | undefined) || null;
            if (f) {
              e.preventDefault();
              addFile(f);
            }
          }}
        >
          {!file ? (
            <div
              className="border border-dashed border-zinc-300 rounded-xl p-8 text-center text-sm text-zinc-600"
              onClick={() =>
                document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
              }
              role="button"
              tabIndex={0}
            >
              Drag &amp; drop a PDF here, or click <span className="underline">Choose PDF</span>.
              <div className="mt-2 text-xs text-zinc-500">
                Limits: ≤ {formatMB10(MAX_FILE_BYTES)} MB • ≤ {MAX_PAGES} pages
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-zinc-700">{metaLine}</div>

              {/* Thumbs grid with DnD */}
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {thumbs.map((t, idx) => {
                  const isDragging = draggingIndex === idx;
                  const isOver = dragOverIndex === idx && draggingIndex !== idx;
                  return (
                    <li
                      key={`${t.i}-${idx}`}
                      draggable
                      onDragStart={() => onItemDragStart(idx)}
                      onDragEnter={() => onItemDragEnter(idx)}
                      onDragEnd={onItemDragEnd}
                      onDrop={onItemDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className={[
                        'relative group select-none rounded-xl border bg-white p-1.5',
                        'border-zinc-200',
                        'transition-shadow',
                        isDragging ? 'opacity-70 shadow-md' : 'hover:shadow-sm',
                        isOver ? 'ring-2 ring-emerald-500 ring-offset-2' : '',
                        'cursor-grab active:cursor-grabbing',
                      ].join(' ')}
                      title="Drag to reorder"
                    >
                      {/* cleaner preview frame */}
                      <div className="rounded-md overflow-hidden bg-zinc-50 border border-zinc-200">
                        {t.url ? (
                          <img
                            src={t.url}
                            alt={`Page ${idx + 1}`}
                            className="w-full h-auto block"
                          />
                        ) : (
                          <div className="aspect-[3/4] bg-zinc-200 animate-pulse" />
                        )}
                      </div>

                      {/* page number badge */}
                      <div className="absolute top-1 left-1 text-[11px] px-1.5 py-0.5 rounded-md bg-black/70 text-white">
                        {idx + 1}
                      </div>

                      {/* delete button (clean icon style) */}
                      <button
                        onClick={() => removeAt(idx)}
                        className="absolute top-1 right-1 rounded-md bg-white/90 border border-zinc-300 text-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition"
                        title="Delete page"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setFile(null);
                    setPages(null);
                    setThumbs([]);
                    setProgress(0);
                    targetRef.current = 0;
                  }}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  onClick={onExport}
                  disabled={!canExport || (pages ?? 0) > MAX_PAGES}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    canExport && (pages ?? 0) <= MAX_PAGES
                      ? 'bg-black text-white'
                      : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {busy ? 'Exporting…' : 'Export PDF'}
                </button>
              </div>

              <div className="text-xs text-zinc-500">
                Tip: drag thumbnails to reorder. Deleted pages won’t be included in the export.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
