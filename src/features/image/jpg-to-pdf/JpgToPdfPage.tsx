import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';
import {
  imagesToPdf,
  type JpgToPdfOptions,
  type PagePreset,
  type Orientation,
  type ScaleMode,
} from './jpgToPdf';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 60;
const MM_TO_PT = 72 / 25.4;

const PREVIEW_W = 360;
const PREVIEW_H = 480;
const PREVIEW_PAD = 10;

type Item = { id: string; file: File; url: string };
const uid = () => Math.random().toString(36).slice(2, 9);
const baseName = (n: string) => n.replace(/\.(png|jpg|jpeg|webp)$/i, '');
const fmtMB = (b: number) => (b / (1024 * 1024)).toFixed(2) + ' MB';

export default function JpgToPdfPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Idle');

  const [preset, setPreset] = useState<PagePreset>('Letter');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [marginMm, setMarginMm] = useState<number>(10);
  const [scale, setScale] = useState<ScaleMode>('fit');
  const [jpegQuality, setJpegQuality] = useState<number>(0.85);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const totalSize = useMemo(() => items.reduce((s, i) => s + i.file.size, 0), [items]);

  const opts: JpgToPdfOptions = useMemo(
    () => ({ preset, orientation, marginMm, scale, jpegQuality, backgroundColor: '#ffffff' }),
    [preset, orientation, marginMm, scale, jpegQuality]
  );

  const addFiles = useCallback((files: File[]) => {
    const accepted: File[] = [];
    for (const f of files) {
      if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) continue;
      if (f.size > MAX_FILE_BYTES) continue;
      accepted.push(f);
    }
    if (!accepted.length) {
      alert('Please choose PNG/JPG/WebP images (≤ 25 MB each).');
      return;
    }
    setItems((prev) => {
      const remaining = Math.max(0, MAX_FILES - prev.length);
      const next = accepted
        .slice(0, remaining)
        .map((f) => ({ id: uid(), file: f, url: URL.createObjectURL(f) }));
      const out = [...prev, ...next];
      setSelectedIdx((idx) => Math.min(idx, out.length - 1));
      return out;
    });
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files ?? []);
    if (arr.length) addFiles(arr);
    e.currentTarget.value = '';
  };

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
  }, [addFiles]);

  function clearAll() {
    setItems((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setSelectedIdx(0);
    setBusy(false);
    setProgress(0);
    setPhase('Idle');
  }

  const dragSrcIdx = useRef<number | null>(null);
  const onGripDragStart = (idx: number) => (e: React.DragEvent<HTMLButtonElement>) => {
    dragSrcIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx)); // Firefox needs this
  };
  const onRowDragOver = () => (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onRowDrop = (idx: number) => (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    const from = dragSrcIdx.current;
    dragSrcIdx.current = null;
    if (from == null || from === idx) return;
    setItems((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      setSelectedIdx((s) => (s === from ? idx : s));
      return next;
    });
  };

  useEffect(() => {
    const cvs = previewRef.current;
    if (!cvs || items.length === 0) return;

    cvs.width = PREVIEW_W;
    cvs.height = PREVIEW_H;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const url = items[selectedIdx]?.url;
    if (!url) {
      ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth,
        ih = img.naturalHeight;

      let pageW: number, pageH: number;
      if (opts.preset === 'auto') {
        const MAX_SIDE = 1440;
        const s = Math.min(1, MAX_SIDE / Math.max(iw, ih));
        pageW = Math.max(72, iw * s);
        pageH = Math.max(72, ih * s);
      } else {
        const sizes = { A4: { w: 595.28, h: 841.89 }, Letter: { w: 612, h: 792 } } as const;
        const base = sizes[opts.preset as 'A4' | 'Letter'];
        pageW = opts.orientation === 'portrait' ? base.w : base.h;
        pageH = opts.orientation === 'portrait' ? base.h : base.w;
      }
      const margin = Math.min(opts.marginMm * MM_TO_PT, Math.min(pageW, pageH) / 4);
      const cw = Math.max(1, pageW - margin * 2);
      const ch = Math.max(1, pageH - margin * 2);

      const sPage = Math.min(
        (PREVIEW_W - PREVIEW_PAD * 2) / pageW,
        (PREVIEW_H - PREVIEW_PAD * 2) / pageH
      );
      const pagePxW = pageW * sPage;
      const pagePxH = pageH * sPage;
      const pageX = (PREVIEW_W - pagePxW) / 2;
      const pageY = (PREVIEW_H - pagePxH) / 2;

      const fit = Math.min(cw / iw, ch / ih);
      const cover = Math.max(cw / iw, ch / ih);
      const sImg = (opts.scale === 'fill' ? cover : fit) * sPage;
      const drawPxW = iw * sImg;
      const drawPxH = ih * sImg;
      const dx = pageX + margin * sPage + (cw * sPage - drawPxW) / 2;
      const dy = pageY + margin * sPage + (ch * sPage - drawPxH) / 2;

      ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

      // Page
      ctx.shadowColor = 'rgba(0,0,0,0.06)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pageX, pageY, pagePxW, pagePxH);

      // Reset shadow; draw page border
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(pageX + 0.5, pageY + 0.5, pagePxW - 1, pagePxH - 1);

      // Image
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, dx, dy, drawPxW, drawPxH);
    };
    img.src = url;
  }, [
    items,
    selectedIdx,
    opts.preset,
    opts.orientation,
    opts.marginMm,
    opts.scale,
    opts.jpegQuality,
  ]);

  async function onExport() {
    if (!items.length) return;
    setBusy(true);
    setProgress(0);
    setPhase('Building PDF…');
    try {
      const files = items.map((i) => i.file);
      const blob = await imagesToPdf(files, opts, (pct, label) => {
        setProgress(pct);
        if (label) setPhase(label);
      });
      const name = items.length === 1 ? baseName(items[0].file.name) : 'images';
      await downloadBlob(blob, `${name}.pdf`);
      clearAll();
    } catch (e) {
      console.error(e);
      alert('Failed to build PDF. Try fewer or smaller images.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SeoHead
        title="JPG → PDF — Free Online, Private | FileTools"
        description="Combine PNG/JPG/WebP images into a single PDF. Drag to reorder, set page size, margins, and orientation. Private — runs in your browser."
        path="/jpg-to-pdf"
        type="website"
        keywords="jpg to pdf, png to pdf, images to pdf, convert jpg to pdf, online"
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,520px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">Processing…</h2>
            <p className="text-center text-sm text-zinc-600 mt-1">{phase}</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">JPG → PDF</h1>
      <p className="text-sm text-zinc-600">
        Drop one or many images (PNG/JPG/WebP), drag to reorder, tweak options, and export a single
        PDF.
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Upload Images</div>
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
            const list = Array.from(e.dataTransfer?.files ?? []) as File[];
            if (list.length) {
              e.preventDefault();
              addFiles(list);
            }
          }}
        >
          {items.length === 0 ? (
            <div
              className="border border-dashed border-zinc-300 rounded-xl p-8 text-center text-sm text-zinc-600"
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              Drag &amp; drop images here, or click <span className="underline">Choose Images</span>
              .
              <div className="mt-2 text-xs text-zinc-500">
                Limits: ≤ 25 MB each • PNG, JPG, WebP • up to {MAX_FILES} files
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* List + Preview (responsive) */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
                {/* FILE LIST (like Merge PDF) */}
                <div className="rounded-xl border border-zinc-200 bg-white">
                  {/* header row */}
                  <div className="px-4 py-3 border-b border-zinc-200 text-sm font-medium">
                    Your image files
                  </div>

                  <ul className="divide-y divide-zinc-200">
                    {items.map((it, i) => (
                      <li
                        key={it.id}
                        onDragOver={onRowDragOver()}
                        onDrop={onRowDrop(i)}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          i === selectedIdx ? 'bg-emerald-50' : ''
                        }`}
                        onClick={() => setSelectedIdx(i)}
                      >
                        {/* grip/dots */}
                        <button
                          draggable
                          onDragStart={onGripDragStart(i)}
                          className="text-zinc-400 hover:text-zinc-700 cursor-grab select-none"
                          aria-label="Drag to reorder"
                          title="Drag to reorder"
                        >
                          <span className="block leading-none">⋮⋮</span>
                          <span className="block leading-none -mt-1">⋮⋮</span>
                        </button>

                        {/* thumbnail */}
                        <div className="w-[56px] h-[56px] rounded-md border border-zinc-200 bg-zinc-50 grid place-items-center overflow-hidden">
                          <img src={it.url} alt="" className="max-h-[52px] w-auto" />
                        </div>

                        {/* name */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">
                            {i + 1}. {it.file.name}
                          </div>
                          <div className="text-xs text-zinc-500">{fmtMB(it.file.size)}</div>
                        </div>

                        {/* remove */}
                        <button
                          className="px-2.5 py-1.5 rounded-md border border-zinc-300 text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItems((prev) => {
                              const next = prev.slice();
                              const idx = next.findIndex((p) => p.id === it.id);
                              if (idx >= 0) {
                                URL.revokeObjectURL(next[idx].url);
                                next.splice(idx, 1);
                              }
                              setSelectedIdx((s) => Math.min(s, next.length - 1));
                              return next;
                            });
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* footer controls like Merge PDF */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-zinc-200 text-sm text-zinc-600">
                    <div>
                      Files: {items.length} • Total: {fmtMB(totalSize)} • Limits: up to {MAX_FILES}{' '}
                      files, each ≤ 25.00 MB
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={clearAll}
                        className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={onExport}
                        className="px-4 py-2 rounded-lg text-sm bg-black text-white"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* PREVIEW PANEL (fixed canvas) */}
                <div className="rounded-xl border border-zinc-200 bg-white">
                  <div className="px-4 py-3 border-b border-zinc-200 text-sm font-medium">
                    Preview
                  </div>
                  <div className="p-3">
                    <div className="grid place-items-center bg-zinc-50 rounded-lg p-3">
                      <canvas
                        ref={previewRef}
                        width={PREVIEW_W}
                        height={PREVIEW_H}
                        className="w-[360px] h-[480px] max-w-full"
                        style={{ display: 'block' }}
                      />
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-2">
                      Fixed preview box. Orientation changes (Portrait/Landscape) affect the page
                      shape inside.
                    </div>
                  </div>

                  {/* OPTIONS */}
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="text-sm">
                      <div className="font-medium">Page Size</div>
                      <select
                        value={preset}
                        onChange={(e) => setPreset(e.target.value as PagePreset)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="Letter">Letter (8.5 × 11 in)</option>
                        <option value="A4">A4 (210 × 297 mm)</option>
                        <option value="auto">Auto (match image)</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <div className="font-medium">Orientation</div>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value as Orientation)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        disabled={preset === 'auto'}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <div className="font-medium">Margins (mm)</div>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        step={1}
                        value={marginMm}
                        onChange={(e) =>
                          setMarginMm(Math.max(0, Math.min(40, Number(e.target.value) || 0)))
                        }
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      />
                    </label>

                    <label className="text-sm">
                      <div className="font-medium">Scale</div>
                      <select
                        value={scale}
                        onChange={(e) => setScale(e.target.value as ScaleMode)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="fit">Fit inside margins</option>
                        <option value="fill">Fill (cover; may crop/bleed)</option>
                      </select>
                    </label>

                    <label className="text-sm sm:col-span-2">
                      <div className="font-medium">JPEG Quality ({jpegQuality.toFixed(2)})</div>
                      <input
                        type="range"
                        min={0.6}
                        max={0.95}
                        step={0.01}
                        value={jpegQuality}
                        onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-zinc-500">
                        Lower = smaller PDF • Higher = better quality.
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
