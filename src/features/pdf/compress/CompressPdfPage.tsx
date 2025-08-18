import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { downloadBlob } from '../../../utils/download';
import { compressPdf, type CompressOptions } from './compressPdf';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 200;

function formatMB10(bytes: number) {
  return (bytes / 1_000_000).toFixed(2);
}
function baseName(name: string) {
  return name.replace(/\.pdf$/i, '');
}
function isNamedError(x: unknown, name: string): x is { name: string; message?: string } {
  return (
    typeof x === 'object' && x !== null && 'name' in x && (x as { name?: unknown }).name === name
  );
}

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<{ pages: number } | null>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const [preset, setPreset] = useState<'email' | 'standard' | 'high' | 'custom'>('standard');
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.65);

  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [estimateMB, setEstimateMB] = useState<string | null>(null);
  const [actualMB, setActualMB] = useState<string | null>(null);

  const canCompress = !!file && !!meta && !busy;
  const locked = preset !== 'custom';

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
      setMeta(null);
      setEstimateMB(null);
      setActualMB(null);
      setThumbUrl(null);
      if (!file) return;

      try {
        const data = await file.arrayBuffer();
        const pdf = await getDocument({ data }).promise;
        const pages = pdf.numPages;
        if (!cancelled) setMeta({ pages });
        if (pages > MAX_PAGES) {
          alert(`This PDF has ${pages} pages. Limit is ${MAX_PAGES}.`);
        }

        try {
          const page = await pdf.getPage(1);
          const vp = page.getViewport({ scale: 1 });
          const targetW = 220;
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
        if (!cancelled) setMeta(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    setActualMB(null);
    if (preset === 'email') {
      setDpi(120);
      setQuality(0.5);
    } else if (preset === 'standard') {
      setDpi(150);
      setQuality(0.65);
    } else if (preset === 'high') {
      setDpi(200);
      setQuality(0.8);
    }
  }, [preset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEstimateMB(null);
      if (!file || !meta?.pages) return;

      try {
        const data = await file.arrayBuffer();
        const pdf = await getDocument({ data }).promise;

        const total = meta.pages;
        const samples = Array.from(new Set([1, Math.max(1, Math.ceil(total / 2)), total])).sort(
          (a, b) => a - b
        );

        const bytes: number[] = [];

        for (const idx of samples) {
          const page = await pdf.getPage(idx);
          const scale = dpi / 96;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const b = Math.ceil((dataUrl.length * 3) / 4);
          bytes.push(b);

          // free memory
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = canvas.height = 0;

          if (cancelled) return;
        }

        if (!bytes.length) return;
        const avg = bytes.reduce((a, b) => a + b, 0) / bytes.length;
        const estMB = (avg * total) / 1_000_000;
        if (!cancelled) setEstimateMB(estMB.toFixed(2));
      } catch (e) {
        console.warn('estimate failed', e);
        if (!cancelled) setEstimateMB(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, meta?.pages, dpi, quality]);

  function onChangeQuality(next: number) {
    if (locked) return;
    setQuality(next);
    setActualMB(null);
  }
  function onChangeDpi(next: number) {
    if (locked) return;
    setDpi(next);
    setActualMB(null);
  }

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

  async function onCompress() {
    if (!file) return;
    try {
      setBusy(true);
      setProgress(0);
      const opts: CompressOptions = { dpi, quality, onProgress: (p) => setProgress(p) };
      const blob = await compressPdf(file, opts);
      setActualMB(formatMB10(blob.size));
      downloadBlob(blob, `${baseName(file.name)}_compressed.pdf`);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      if (isNamedError(e, 'PasswordException')) {
        alert('This PDF seems to be password-protected.');
      } else if (msg.includes('Rasterization failed')) {
        alert('This PDF is very large. Try the Email preset.');
      } else {
        alert('Compression failed. Try a lower DPI/quality or a smaller file.');
      }
    } finally {
      setBusy(false);
    }
  }

  const metaLine = useMemo(() => {
    if (!file) return 'No file selected.';
    const sizeMB = formatMB10(file.size);
    const pages = meta?.pages ?? '…';
    const out = actualMB
      ? ` • Output: ${actualMB} MB`
      : estimateMB
        ? ` • Est. output: ≈ ${estimateMB} MB`
        : '';
    return `${file.name} • ${sizeMB} MB • Pages: ${pages}${out}`;
  }, [file, meta?.pages, estimateMB, actualMB]);

  return (
    <div className="space-y-6">
      {/* Loading overlay */}
      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">Compressing your PDF…</h2>
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

      <h1 className="text-2xl font-bold">Compress PDF</h1>
      <p className="text-sm text-zinc-600">
        Convert each PDF page to a JPEG image at your chosen DPI and quality — great for scans and
        photos.
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
              Drag & drop a PDF here, or click <span className="underline">Choose PDF</span>.
              <div className="mt-2 text-xs text-zinc-500">
                Limits: ≤ {formatMB10(MAX_FILE_BYTES)} MB • ≤ {MAX_PAGES} pages
              </div>
            </div>
          ) : (
            <>
              {/* Meta + thumbnail */}
              <div className="flex items-start gap-4">
                {thumbUrl && (
                  <img
                    src={thumbUrl}
                    alt="First page preview"
                    className="w-28 h-auto rounded border border-zinc-200"
                  />
                )}
                <div className="text-sm text-zinc-700">{metaLine}</div>
              </div>

              {/* Presets */}
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Preset</div>
                <div className="flex flex-wrap gap-2">
                  {(['email', 'standard', 'high', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPreset(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        preset === p
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-zinc-800 border-zinc-200'
                      }`}
                    >
                      {p === 'email' && 'Email (small)'}
                      {p === 'standard' && 'Standard'}
                      {p === 'high' && 'High'}
                      {p === 'custom' && 'Custom'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls (locked unless Custom) */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`${locked ? 'opacity-60' : ''}`}>
                  <div className="text-sm font-medium mb-1">Quality ({quality.toFixed(2)})</div>
                  <input
                    type="range"
                    min={0.2}
                    max={0.95}
                    step={0.01}
                    value={quality}
                    onChange={(e) => onChangeQuality(parseFloat(e.target.value))}
                    className="w-full"
                    disabled={locked}
                  />
                  <div className="text-xs text-zinc-500 mt-1">
                    {locked ? 'Switch to Custom to edit.' : 'Lower = smaller file'}
                  </div>
                </div>

                <div className={`${locked ? 'opacity-60' : ''}`}>
                  <div className="text-sm font-medium mb-1">Resolution (DPI)</div>
                  <select
                    value={dpi}
                    onChange={(e) => onChangeDpi(parseInt(e.target.value, 10))}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 disabled:bg-zinc-100"
                    disabled={locked}
                  >
                    <option value={120}>120 DPI (smallest)</option>
                    <option value={150}>150 DPI (balanced)</option>
                    <option value={200}>200 DPI (sharper)</option>
                    <option value={300}>300 DPI (largest)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => setFile(null)}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  onClick={onCompress}
                  disabled={!canCompress || (meta?.pages ?? 0) > MAX_PAGES}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    canCompress && (meta?.pages ?? 0) <= MAX_PAGES
                      ? 'bg-black text-white'
                      : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {busy ? 'Compressing…' : 'Compress PDF'}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
