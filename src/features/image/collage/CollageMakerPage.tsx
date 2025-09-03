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
    <div className="space-y-6">
      <SeoHead
        title="Collage Maker — Fast, Private (In-Browser) | FileTools"
        description="Pick a template, drop photos, tweak spacing & corners, download. Heart, grid, and film strip. All client-side."
        path="/collage-maker"
        type="website"
        keywords="photo collage, heart collage, grid collage, online collage maker"
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">{phase}</h2>
            <p className="text-center text-sm text-zinc-600 mt-1">Please wait…</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: '85%' }} />
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">Collage Maker</h1>
      <p className="text-sm text-zinc-600">Pick a template → drop photos → tweak → download.</p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Upload</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-sm cursor-pointer">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={onPick}
              />
              Choose Images
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
          {/* Reorderable thumbs with 6-dot handle */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {files.map((p, i) => (
                <div
                  key={i}
                  className={`relative flex items-center gap-2 border border-zinc-200 rounded-lg p-2 ${
                    dragIdx === i ? 'ring-2 ring-emerald-500' : ''
                  }`}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={(e) => onDragOverThumb(e, i)}
                  onDragEnd={onDragEnd}
                >
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
                    className="w-24 h-16 object-cover rounded border border-zinc-200"
                  />

                  <button
                    onClick={() => removeAt(i)}
                    className="ml-1 px-2 py-1 text-[11px] rounded border border-zinc-200 hover:bg-zinc-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <section className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Templates</div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        template === t.id
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-zinc-800 border-zinc-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">
                  <div className="font-medium">Aspect</div>
                  <select
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value as Aspect)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="square">Square</option>
                    <option value="4:5">4:5 (Portrait)</option>
                    <option value="3:4">3:4</option>
                    <option value="3:2">3:2</option>
                    <option value="4:3">4:3</option>
                    <option value="16:9">16:9 (Wide)</option>
                  </select>
                </label>

                <label className="text-sm">
                  <div className="font-medium">Fit</div>
                  <select
                    value={fit}
                    onChange={(e) => setFit(e.target.value as FitMode)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="fill">Fill (crop to fill)</option>
                    <option value="fit">Fit (no crop)</option>
                  </select>
                </label>

                <label className="text-sm col-span-2">
                  <div className="font-medium">Spacing</div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    step={1}
                    value={spacing}
                    onChange={(e) => setSpacing(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <div className="text-xs text-zinc-500">Controls margins & gutters together.</div>
                </label>

                <label className="text-sm col-span-2">
                  <div className="font-medium">Corner radius</div>
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

                <label className="text-sm">
                  <div className="font-medium">Background</div>
                  <input
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    placeholder="#ffffff"
                  />
                </label>

                <label className="text-sm">
                  <div className="font-medium">Fill cells</div>
                  <select
                    value={fillPolicy}
                    onChange={(e) => setFillPolicy(e.target.value as FillPolicy)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="blank">First N only (leave empty)</option>
                    <option value="repeat">Repeat images to fill</option>
                  </select>
                </label>

                <label className="text-sm">
                  <div className="font-medium">Output width (px)</div>
                  <input
                    type="number"
                    min={512}
                    value={outW}
                    onChange={(e) => setOutW(Math.max(512, parseInt(e.target.value || '0', 10)))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <div className="font-medium">Format</div>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'image/png' | 'image/jpeg')}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="image/png">PNG (.png)</option>
                    <option value="image/jpeg">JPEG (.jpg)</option>
                  </select>
                </label>

                <label className="text-sm col-span-2">
                  <div className="font-medium">
                    Quality {format === 'image/png' ? '(n/a)' : `(${quality.toFixed(2)})`}
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={0.98}
                    step={0.01}
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full disabled:opacity-50"
                    disabled={format === 'image/png'}
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAll}
                  className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50"
                >
                  Reset
                </button>
                <button
                  onClick={onDownload}
                  disabled={!files.length}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    files.length
                      ? 'bg-black text-white'
                      : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Download
                </button>
              </div>

              <div className="text-xs text-zinc-500">
                Private by design — processing happens in your browser.
              </div>
            </section>

            {/* Preview */}
            <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-medium mb-2 text-zinc-700">Preview</div>
              <div className="rounded-md overflow-hidden grid place-items-center bg-white min-h-[180px]">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-w-full h-auto" />
                ) : (
                  <div className="text-xs text-zinc-500 py-10">
                    {files.length ? phase : 'Add some photos to see the preview.'}
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
