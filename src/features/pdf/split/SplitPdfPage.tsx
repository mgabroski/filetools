import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';
import { splitPdf, parseRanges } from './splitPdf';
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

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  const [ranges, setRanges] = useState<string>('1-');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const targetRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const canExport = !!file && !!pages && ranges.trim().length > 0 && !busy;

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
      setThumbUrl(null);
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        const pdf = await getDocument({ data: buf }).promise;
        const count = pdf.numPages;
        if (!cancelled) setPages(count);
        if (count > MAX_PAGES) alert(`This PDF has ${count} pages. Limit is ${MAX_PAGES}.`);

        try {
          const page = await pdf.getPage(1);
          const vp = page.getViewport({ scale: 1 });
          const targetW = 96;
          const scale = targetW / vp.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const url = canvas.toDataURL('image/png');
          if (!cancelled) setThumbUrl(url);
        } catch {
          /* ignore preview failure */
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setPages(null);
          setThumbUrl(null);
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
    if (!file || !pages) return;

    const selected = parseRanges(ranges, pages);
    if (selected.size === 0) {
      alert('Please enter at least one valid page or range.');
      return;
    }

    setBusy(true);
    setProgress(0);
    targetRef.current = 10;
    startSmoothProgress();

    try {
      const outBlob = await splitPdf(file, {
        ranges,
        onProgress: (p) => {
          targetRef.current = Math.min(100, Math.max(15, p));
        },
      });
      const name = baseName(file.name);
      const suffix =
        selected.size === pages
          ? 'all'
          : selected.size === 1
            ? `p${[...selected][0]}`
            : `${selected.size}-pages`;
      await downloadBlob(outBlob, `${name}_split_${suffix}.pdf`);
      targetRef.current = 100;
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Split failed. Check your page ranges and try again.');
    } finally {
      setTimeout(() => {
        stopSmoothProgress();
        setBusy(false);
        // full reset after export
        setFile(null);
        setPages(null);
        setThumbUrl(null);
        setRanges('1-');
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
        title="Split PDF — Extract Selected Pages (Free & Private) | FileTools"
        description="Split a PDF by pages or ranges (e.g., 1-3, 7, 9-). Everything runs in your browser — private by design."
        path="/split-pdf"
        image="/og/og-split-pdf.png"
        type="website"
        keywords="split pdf, extract pdf pages, split pdf online, pdf page range tool"
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">Splitting pages…</h2>
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

      <h1 className="text-2xl font-bold">Split PDF</h1>
      <p className="text-sm text-zinc-600">
        Keep only the pages you need. Use <code>1-3, 5, 9-</code> for ranges (1-based, inclusive).
        Your files never leave your device.
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Upload</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-sm cursor-pointer">
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
            <div className="md:flex md:items-start md:gap-5">
              {/* LEFT: compact preview */}
              <div className="md:w-38 w-32 shrink-0">
                <div className="w-32 md:w-36 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt="First page preview"
                      className="w-full h-auto rounded-md border border-zinc-200"
                    />
                  ) : (
                    <div className="aspect-[3/4] rounded-md bg-zinc-200 animate-pulse" />
                  )}
                </div>
                <div className="mt-2 text-xs text-zinc-500">This is a local preview only.</div>
              </div>

              {/* RIGHT: meta + controls */}
              <div className="md:flex-1 md:max-w-3xl mt-4 md:mt-0 space-y-4">
                <div className="text-sm text-zinc-700">{metaLine}</div>

                <section className="space-y-2">
                  <div className="text-sm font-medium">Page ranges</div>
                  <input
                    type="text"
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    placeholder="e.g., 1-3, 7, 9-"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <div className="text-xs text-zinc-500">
                    Tips: <code>1-3</code> keeps 1 to 3. <code>7</code> keeps page 7.{' '}
                    <code>9-</code> keeps 9 to the end. <code>-5</code> keeps 1 to 5.
                  </div>
                  {!!pages && (
                    <div className="text-xs text-emerald-700">
                      Selected pages: {parseRanges(ranges, pages).size || 0}
                    </div>
                  )}
                </section>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setFile(null);
                      setPages(null);
                      setThumbUrl(null);
                      setRanges('1-');
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
                    {busy ? 'Splitting…' : 'Export PDF'}
                  </button>
                </div>

                <div className="text-xs text-zinc-500">
                  Export creates a new PDF containing only the selected pages (combined).
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
