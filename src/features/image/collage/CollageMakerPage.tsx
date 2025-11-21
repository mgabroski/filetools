import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';
import type { Aspect, FillPolicy, FitMode, TemplateId } from './collage';
import { TEMPLATE_OPTIONS } from './templates';
import { renderCollage } from './renderCollage';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PREVIEW_W = 900;

type PreviewFile = { file: File; url: string };

export default function CollageMakerPage() {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [template, setTemplate] = useState<TemplateId>('auto');
  const [aspect, setAspect] = useState<Aspect>('square');
  const [fit, setFit] = useState<FitMode>('fill');
  const [fillPolicy, setFillPolicy] = useState<FillPolicy>('blank');

  const [spacing, setSpacing] = useState(12);
  const [cornerRadius, setCornerRadius] = useState(12);
  const [bg, setBg] = useState('#ffffff');
  const [outW, setOutW] = useState(2048);
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [quality, setQuality] = useState(0.9);

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('Idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const previewOpts = useMemo(
    () => ({
      template,
      outputWidth: PREVIEW_W,
      aspect,
      spacing,
      cornerRadius,
      bg,
      fit,
      format: 'image/png' as const,
      quality: 0.92,
      fillPolicy,
    }),
    [template, aspect, spacing, cornerRadius, bg, fit, fillPolicy]
  );

  function addFiles(list: FileList | File[]) {
    const next: PreviewFile[] = [];
    for (const f of Array.from(list)) {
      if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) continue;
      if (f.size > MAX_FILE_BYTES) continue;
      next.push({ file: f as File, url: URL.createObjectURL(f) });
    }
    setFiles((prev) => [...prev, ...next].slice(0, 32));
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files);
    e.currentTarget.value = '';
  }

  // Live preview (same renderer as export — WYSIWYG)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!files.length) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        return;
      }
      setPhase('Rendering preview…');
      try {
        const srcFiles = files.map((p) => p.file);
        const blob = await renderCollage(srcFiles, previewOpts);
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(u);
        setPhase('Idle');
      } catch (e) {
        console.error(e);
        if (!cancelled) setPhase('Idle');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    files,
    previewOpts.template,
    previewOpts.aspect,
    previewOpts.spacing,
    previewOpts.cornerRadius,
    previewOpts.bg,
    previewOpts.fit,
    previewOpts.fillPolicy,
  ]);

  // Global DnD add files
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

  function resetAll() {
    files.forEach((p) => URL.revokeObjectURL(p.url));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFiles([]);
    setPreviewUrl(null);
    setBusy(false);
    setPhase('Idle');
  }

  async function onDownload() {
    if (!files.length) return;
    setBusy(true);
    setPhase('Exporting…');
    try {
      const srcFiles = files.map((p) => p.file);
      const blob = await renderCollage(srcFiles, {
        template,
        outputWidth: outW,
        aspect,
        spacing,
        cornerRadius,
        bg,
        fit,
        format,
        quality,
        fillPolicy,
      });
      const name =
        srcFiles.length === 1 ? srcFiles[0].name.replace(/\.(png|jpg|jpeg|webp)$/i, '') : 'collage';
      const ext = format === 'image/png' ? 'png' : 'jpg';
      await downloadBlob(blob, `${name}.${ext}`);
      resetAll();
    } catch (e) {
      console.error(e);
      alert('Download failed. Try again.');
      setBusy(false);
      setPhase('Idle');
    }
  }

  // --- drag & drop reordering of thumbs ---
  function onDragStart(idx: number) {
    setDragIdx(idx);
  }
  function onDragOverThumb(e: React.DragEvent, overIdx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === overIdx) return;
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, item);
      return next;
    });
    setDragIdx(overIdx);
  }
  function onDragEnd() {
    setDragIdx(null);
  }
  function removeAt(i: number) {
    setFiles((prev) => {
      const next = [...prev];
      const [rm] = next.splice(i, 1);
      if (rm) URL.revokeObjectURL(rm.url);
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SeoHead
        title="Collage Maker — Fast, Private (In-Browser) | FileTools"
        description="Pick a template, drop photos, tweak spacing & corners, download. Heart, grid, and film strip. All client-side."
        path="/collage-maker"
        type="website"
        keywords="photo collage, heart collage, grid collage, online collage maker"
      />

      {/* Busy overlay */}
      {busy && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-xl border border-zinc-200">
            <h2 className="text-lg sm:text-xl font-semibold text-center text-zinc-900">{phase}</h2>
            <p className="text-center text-sm text-zinc-600 mt-1">
              Depending on resolution and number of photos, this can take a few seconds.
            </p>
            <div className="mt-5 h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div className="h-full bg-emerald-600 animate-pulse" style={{ width: '85%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Page intro */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
          Collage Maker
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 max-w-2xl">
          Drop your photos, choose a layout and aspect ratio, adjust spacing and corners, then
          download a high-resolution collage — all processed directly in your browser.
        </p>
      </div>

      <Card>
        {/* Upload + summary header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-zinc-900">Upload photos</div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Up to 32 images · JPG, PNG, WEBP · Max {MAX_FILE_BYTES / (1024 * 1024)} MB each.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm cursor-pointer hover:bg-zinc-900 transition">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={onPick}
              />
              <span>Choose images</span>
            </label>
          </div>
        </CardHeader>

        <CardContent
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
            if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
          }}
          onDrop={(e: React.DragEvent<HTMLDivElement>) => {
            const list = e.dataTransfer?.files;
            if (list?.length) {
              e.preventDefault();
              addFiles(list);
            }
          }}
        >
          {/* Thumbnails */}
          {files.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-zinc-600">
                  Photos ({files.length}) — drag to reorder
                </div>
                <button
                  onClick={resetAll}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {files.map((p, i) => (
                  <div
                    key={i}
                    className={`relative flex items-center gap-2 border border-zinc-200 rounded-xl p-2 bg-white/70 shadow-sm ${
                      dragIdx === i ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                    }`}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={(e) => onDragOverThumb(e, i)}
                    onDragEnd={onDragEnd}
                  >
                    {/* drag handle */}
                    <div
                      className="cursor-grab text-zinc-400 mr-1 select-none"
                      title="Drag to reorder"
                      aria-hidden
                    >
                      <svg width="14" height="18" viewBox="0 0 8 12" fill="currentColor">
                        <circle cx="2" cy="2" r="1.3" />
                        <circle cx="6" cy="2" r="1.3" />
                        <circle cx="2" cy="6" r="1.3" />
                        <circle cx="6" cy="6" r="1.3" />
                        <circle cx="2" cy="10" r="1.3" />
                        <circle cx="6" cy="10" r="1.3" />
                      </svg>
                    </div>

                    <img
                      src={p.url}
                      alt={`img-${i}`}
                      className="w-24 h-16 object-cover rounded-md border border-zinc-200 bg-zinc-100"
                    />

                    <button
                      onClick={() => removeAt(i)}
                      className="ml-1 px-2 py-1 text-[11px] rounded-md border border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop zone when нема слики */}
          {files.length === 0 && (
            <div className="mb-6">
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500">
                <p className="mb-2 font-medium text-zinc-700">
                  Drop photos here or click &ldquo;Choose images&rdquo; to start.
                </p>
                <p>We&apos;ll build the collage directly in your browser — nothing is uploaded.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <section className="space-y-5">
              {/* Templates */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Layout
                </div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm border transition ${
                        template === t.id
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                          : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders + selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm space-y-1">
                  <div className="font-medium text-zinc-800">Aspect</div>
                  <select
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value as Aspect)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  >
                    <option value="square">Square</option>
                    <option value="4:5">4:5 (Portrait)</option>
                    <option value="3:4">3:4</option>
                    <option value="3:2">3:2</option>
                    <option value="4:3">4:3</option>
                    <option value="16:9">16:9 (Wide)</option>
                  </select>
                </label>

                <label className="text-sm space-y-1">
                  <div className="font-medium text-zinc-800">Fit</div>
                  <select
                    value={fit}
                    onChange={(e) => setFit(e.target.value as FitMode)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  >
                    <option value="fill">Fill (crop to fill)</option>
                    <option value="fit">Fit (no crop)</option>
                  </select>
                </label>

                <label className="text-sm col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-800">Spacing</span>
                    <span className="text-xs text-zinc-500">{spacing}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    step={1}
                    value={spacing}
                    onChange={(e) => setSpacing(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <div className="text-[11px] text-zinc-500">
                    Controls outer margin and space between cells.
                  </div>
                </label>

                <label className="text-sm col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-800">Corner radius</span>
                    <span className="text-xs text-zinc-500">{cornerRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={36}
                    step={1}
                    value={cornerRadius}
                    onChange={(e) => setCornerRadius(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </label>

                <label className="text-sm space-y-1">
                  <div className="font-medium text-zinc-800">Background</div>
                  <input
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-white"
                    placeholder="#ffffff"
                  />
                </label>

                <label className="text-sm space-y-1">
                  <div className="font-medium text-zinc-800">Fill cells</div>
                  <select
                    value={fillPolicy}
                    onChange={(e) => setFillPolicy(e.target.value as FillPolicy)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  >
                    <option value="blank">Use first N photos (leave empty)</option>
                    <option value="repeat">Repeat photos to fill layout</option>
                  </select>
                </label>

                <label className="text-sm space-y-1">
                  <div className="font-medium text-zinc-800">Output width (px)</div>
                  <input
                    type="number"
                    min={512}
                    value={outW}
                    onChange={(e) =>
                      setOutW(Math.max(512, parseInt(e.target.value || '0', 10)))
                    }
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  />
                </label>

                <label className="text-sm space-y-1">
                  <div className="font-medium text-zinc-800">Format</div>
                  <select
                    value={format}
                    onChange={(e) =>
                      setFormat(e.target.value as 'image/png' | 'image/jpeg')
                    }
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  >
                    <option value="image/png">PNG (.png)</option>
                    <option value="image/jpeg">JPEG (.jpg)</option>
                  </select>
                </label>

                <label className="text-sm col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-800">Quality</span>
                    <span className="text-xs text-zinc-500">
                      {format === 'image/png'
                        ? 'Lossless (controlled by PNG)'
                        : quality.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={0.98}
                    step={0.01}
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full disabled:opacity-40"
                    disabled={format === 'image/png'}
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={resetAll}
                  className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                >
                  Reset
                </button>
                <button
                  onClick={onDownload}
                  disabled={!files.length}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    files.length
                      ? 'bg-black text-white hover:bg-zinc-900'
                      : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Download collage
                </button>
              </div>

              <div className="text-[11px] text-zinc-500">
                Private by design — all rendering happens locally in your browser.
              </div>
            </section>

            {/* Preview */}
            <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-zinc-700">Live preview</div>
                <div className="text-[11px] text-zinc-500">
                  Aspect {aspect} · {outW}px wide
                </div>
              </div>
              <div className="rounded-lg overflow-hidden grid place-items-center bg-white min-h-[200px] sm:min-h-[260px]">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-w-full h-auto" />
                ) : (
                  <div className="text-xs text-zinc-500 py-10 px-4 text-center">
                    {files.length
                      ? phase
                      : 'Add a few photos and tweak the options on the left to see your collage preview here.'}
                  </div>
                )}
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
