import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { downloadBlob } from '../../../utils/download';
import { SeoHead } from '../../../components/seo/SeoHead';
import JSZip from 'jszip';
import { rasterizePdf, type RasterizeOptions } from './rasterizePdf';
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

type Preset = 'small' | 'balanced' | 'sharp' | 'max';
type ImgFormat = 'jpeg' | 'png';

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const [format, setFormat] = useState<ImgFormat>('jpeg');
  const [preset, setPreset] = useState<Preset>('balanced');

  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.85);

  const targetRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const canExport = !!file && !!pages && !busy;
  const isJPEG = format === 'jpeg';

  // global DnD guard
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

  // load meta + small thumbnail
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
          const targetW = 96; // smaller thumb
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

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === 'small') {
      setDpi(120);
      setQuality(0.75);
    } else if (p === 'balanced') {
      setDpi(150);
      setQuality(0.85);
    } else if (p === 'sharp') {
      setDpi(200);
      setQuality(0.9);
    } else {
      setDpi(300);
      setQuality(0.95);
    }
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

  // smooth progress
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
    setBusy(true);
    setProgress(0);
    targetRef.current = 10;
    startSmoothProgress();

    try {
      const opts: RasterizeOptions = {
        dpi,
        format,
        quality,
        onProgress: (p) => {
          targetRef.current = Math.min(92, 10 + Math.round((80 * p) / 100));
        },
      };

      const { blobs } = await rasterizePdf(file, opts);
      const name = baseName(file.name);

      if (blobs.length === 1) {
        targetRef.current = 100;
        downloadBlob(blobs[0].blob, `${name}_page-1.${format === 'jpeg' ? 'jpg' : 'png'}`);
      } else {
        const zip = new JSZip();
        blobs.forEach(({ blob, index }) => {
          const idx = String(index).padStart(3, '0');
          zip.file(`${name}_page-${idx}.${format === 'jpeg' ? 'jpg' : 'png'}`, blob);
        });
        await zip
          .generateAsync({ type: 'blob' }, (meta) => {
            targetRef.current = Math.min(100, 92 + Math.round((8 * meta.percent) / 100));
          })
          .then((zipBlob) => downloadBlob(zipBlob, `${name}_images.zip`));
      }
    } catch (e) {
      console.error(e);
      alert('Export failed. Try a smaller PDF or a lower preset.');
    } finally {
      targetRef.current = 100;
      setTimeout(() => {
        stopSmoothProgress();
        setBusy(false);
        // reset form after export
        setFile(null);
        setPages(null);
        setThumbUrl(null);
        setProgress(0);
        setFormat('jpeg');
        setPreset('balanced');
        setDpi(150);
        setQuality(0.85);
      }, 450);
    }
  }

  const metaLine = useMemo(() => {
    if (!file) return 'No file selected.';
    const sizeMB = formatMB10(file.size);
    const p = pages ?? '…';
    return `${file.name} • ${sizeMB} MB • Pages: ${p}`;
  }, [file, pages]);

  const chip = (active: boolean, disabled?: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm border ${
      active ? 'bg-black text-white border-black' : 'bg-white text-zinc-800 border-zinc-200'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  return (
    <div className="space-y-6">
      <SeoHead
        title="PDF to JPG/PNG — Export PDF Pages as Images (Free & Private) | FileTools"
        description="Convert PDF pages to JPG or PNG images online. For JPEG, pick Small, Balanced, Sharp or Max (auto DPI & quality). For PNG, choose DPI (lossless). Private by design — runs in your browser."
        path="/pdf-to-jpg"
        image="/og/og-pdf-to-jpg.png"
        type="website"
        keywords="pdf to jpg, pdf to png, export pdf as images, pdf page to jpeg, pdf to images online"
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">Exporting images…</h2>
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

      <h1 className="text-2xl font-bold">PDF → JPG</h1>
      <p className="text-sm text-zinc-600">
        Export PDF pages to <strong>JPG</strong> or <strong>PNG</strong>. JPEG uses presets (auto
        DPI &amp; quality). PNG is lossless — pick your DPI. Private by design: everything runs in
        your browser.
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
            // two-column: smaller preview LEFT, compact controls RIGHT
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
                <div className="mt-2 text-xs text-zinc-500">
                  Multiple pages will be downloaded as a ZIP.
                </div>
              </div>

              {/* RIGHT: meta + controls (capped width, tighter spacing) */}
              <div className="md:flex-1 md:max-w-3xl mt-4 md:mt-0 space-y-4">
                <div className="text-sm text-zinc-700">{metaLine}</div>

                {/* Format */}
                <section className="space-y-2">
                  <div className="text-sm font-medium">Format</div>
                  <div className="flex flex-wrap gap-2">
                    <button className={chip(isJPEG)} onClick={() => setFormat('jpeg')}>
                      JPEG
                    </button>
                    <button className={chip(!isJPEG)} onClick={() => setFormat('png')}>
                      PNG
                    </button>
                  </div>
                </section>

                {/* JPEG controls */}
                {isJPEG ? (
                  <>
                    <section className="space-y-2">
                      <div className="text-sm font-medium">Preset</div>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ['small', 'Small'],
                            ['balanced', 'Balanced'],
                            ['sharp', 'Sharp'],
                            ['max', 'Max'],
                          ] as [Preset, string][]
                        ).map(([k, label]) => (
                          <button
                            key={k}
                            className={chip(preset === k)}
                            onClick={() => applyPreset(k)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-zinc-500">
                        DPI &amp; quality are selected automatically by the preset.
                      </div>
                    </section>

                    <section className="space-y-2">
                      <div className="text-sm font-medium">Resolution (DPI)</div>
                      <div className="flex flex-wrap gap-2">
                        {[120, 150, 200, 300].map((v) => (
                          <button key={v} className={chip(dpi === v, true)} disabled>
                            {v}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-1">
                      <div className="text-sm font-medium">Quality ({quality.toFixed(2)})</div>
                      <input
                        type="range"
                        min={0.5}
                        max={0.95}
                        step={0.01}
                        value={quality}
                        disabled
                        className="w-full opacity-60 cursor-not-allowed"
                        readOnly
                      />
                      <div className="text-xs text-zinc-500">Preset-defined (read-only).</div>
                    </section>
                  </>
                ) : (
                  // PNG: only DPI
                  <section className="space-y-2">
                    <div className="text-sm font-medium">Resolution (DPI)</div>
                    <div className="flex flex-wrap gap-2">
                      {[120, 150, 200, 300].map((v) => (
                        <button key={v} className={chip(dpi === v)} onClick={() => setDpi(v)}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-zinc-500">
                      PNG is lossless; quality does not apply.
                    </div>
                  </section>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setFile(null);
                      setPages(null);
                      setThumbUrl(null);
                      setProgress(0);
                      targetRef.current = 0;
                      setFormat('jpeg');
                      setPreset('balanced');
                      setDpi(150);
                      setQuality(0.85);
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
                    {busy ? 'Exporting…' : `Export ${format.toUpperCase()}`}
                  </button>
                </div>

                <div className="text-xs text-zinc-500">
                  Need the reverse?{' '}
                  <a href="/jpg-to-pdf" className="underline">
                    Convert images to a PDF (JPG → PDF)
                  </a>
                  .
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
