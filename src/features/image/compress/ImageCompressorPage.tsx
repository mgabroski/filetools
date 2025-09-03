import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';
import { compressOneImage, type ImageCompressOptions, type ImageCompressPreset } from './compress';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PREVIEW_BOX_W = 380;
const PREVIEW_BOX_H = 280;

const fmtMB = (b: number) => (b / (1024 * 1024)).toFixed(2) + ' MB';
const baseName = (n: string) => n.replace(/\.(png|jpg|jpeg|webp)$/i, '');

export default function ImageCompressorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('Idle');

  const [preset, setPreset] = useState<ImageCompressPreset>('web');
  const [quality, setQuality] = useState(0.8);
  const [maxWidth, setMaxWidth] = useState<number | ''>(1920);
  const [maxHeight, setMaxHeight] = useState<number | ''>('');
  const [format, setFormat] = useState<'auto' | 'image/jpeg' | 'image/png'>('auto');
  const [keepTransparency, setKeepTransparency] = useState(true);

  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [outBytes, setOutBytes] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const opt: ImageCompressOptions = useMemo(
    () => ({
      preset,
      quality,
      maxWidth: maxWidth === '' ? undefined : Number(maxWidth),
      maxHeight: maxHeight === '' ? undefined : Number(maxHeight),
      format,
      keepTransparency,
    }),
    [preset, quality, maxWidth, maxHeight, format, keepTransparency]
  );

  useEffect(() => {
    if (preset === 'custom') return;
    if (preset === 'email') {
      setMaxWidth(1280);
      setMaxHeight('');
    } else if (preset === 'web') {
      setMaxWidth(1920);
      setMaxHeight('');
    } else if (preset === 'high') {
      setMaxWidth('');
      setMaxHeight('');
    }
  }, [preset]);

  function addFile(f: File) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      alert('Please choose a PNG/JPG/WebP image.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      alert('File is too large. Max 25 MB.');
      return;
    }
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    if (outUrl) URL.revokeObjectURL(outUrl);
    setFile(f);
    setSrcUrl(URL.createObjectURL(f));
  }
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) addFile(f);
    e.currentTarget.value = '';
  }

  // Live preview (debounced)
  useEffect(() => {
    if (!file) return;
    const t = setTimeout(async () => {
      setPhase('Updating preview…');
      try {
        const res = await compressOneImage(file, opt);
        setOutBytes(res.bytes);
        setOutUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(res.blob);
        });
        setPhase('Idle');
      } catch (e) {
        console.error(e);
        setPhase('Idle');
      }
    }, 150);
    return () => clearTimeout(t);
  }, [file, opt]);

  function resetAll() {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    if (outUrl) URL.revokeObjectURL(outUrl);
    setFile(null);
    setSrcUrl(null);
    setOutUrl(null);
    setOutBytes(null);
    setBusy(false);
    setPhase('Idle');
  }

  async function onDownload() {
    if (!file || !outUrl) return;
    setBusy(true);
    setPhase('Exporting…');
    try {
      const res = await fetch(outUrl);
      const blob = await res.blob();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      await downloadBlob(blob, `${baseName(file.name)}_compressed.${ext}`);
      resetAll(); // clear state after download
    } catch (e) {
      console.error(e);
      alert('Download failed. Try again.');
      setBusy(false);
    }
  }

  const metaLine = useMemo(() => {
    if (!file) return 'No image selected.';
    const original = fmtMB(file.size);
    const out = outBytes != null ? ` → Output: ${fmtMB(outBytes)}` : '';
    return `${file.name} • ${original}${out}`;
  }, [file, outBytes]);

  const presetHint =
    preset === 'email'
      ? 'Preset: Email — quality ~0.60, max width 1280px.'
      : preset === 'web'
        ? 'Preset: Web — quality ~0.75, max width 1920px.'
        : preset === 'high'
          ? 'Preset: High — quality ~0.90, no resize.'
          : '';

  return (
    <div className="space-y-6">
      <SeoHead
        title="Image Compressor — JPG/PNG (Private, In-Browser) | FileTools"
        description="Compress a single image with live preview. Adjust quality and size, keep transparency, and download — all in your browser."
        path="/image-compressor"
        type="website"
        keywords="compress image, reduce image size, jpg compressor, png compressor, image optimizer"
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,520px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">{phase}</h2>
            <p className="text-center text-sm text-zinc-600 mt-1">Please wait…</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: '85%' }} />
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">Image Compressor</h1>
      <p className="text-sm text-zinc-600">
        Upload → tweak settings → preview → download. Private by design — processing happens in your
        browser.
      </p>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Upload</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-sm cursor-pointer">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPick}
              />
              Choose Image
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
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              Drag &amp; drop an image here, or click{' '}
              <span className="underline">Choose Image</span>.
              <div className="mt-2 text-xs text-zinc-500">Limits: ≤ 25 MB • PNG, JPG, WebP</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* meta */}
              <div className="text-sm text-zinc-700">{metaLine}</div>

              {/* PREVIEW ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-medium mb-2 text-zinc-700">Original</div>
                  <div className="rounded-md overflow-hidden grid place-items-center bg-white min-h-[140px]">
                    <img
                      src={srcUrl!}
                      alt="Original"
                      className="max-h-[260px] w-auto"
                      style={{ maxWidth: PREVIEW_BOX_W, maxHeight: PREVIEW_BOX_H }}
                    />
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-zinc-700">
                      Compressed{' '}
                      {outBytes != null && (
                        <span className="text-zinc-500">({fmtMB(outBytes)})</span>
                      )}
                    </div>
                    {phase !== 'Idle' && <div className="text-[11px] text-zinc-500">{phase}</div>}
                  </div>
                  <div className="rounded-md overflow-hidden grid place-items-center bg-white min-h-[140px]">
                    {outUrl ? (
                      <img
                        src={outUrl}
                        alt="Compressed preview"
                        className="max-h-[260px] w-auto"
                        style={{ maxWidth: PREVIEW_BOX_W, maxHeight: PREVIEW_BOX_H }}
                      />
                    ) : (
                      <div className="text-xs text-zinc-500 py-10">Generating preview…</div>
                    )}
                  </div>
                </div>
              </div>

              {/* OPTIONS */}
              {preset !== 'custom' ? (
                <div className="space-y-3">
                  <section className="space-y-2">
                    <div className="text-sm font-medium">Preset</div>
                    <div className="flex flex-wrap gap-2">
                      {(['email', 'web', 'high', 'custom'] as const).map((p) => (
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
                          {p === 'web' && 'Web (balanced)'}
                          {p === 'high' && 'High (quality)'}
                          {p === 'custom' && 'Custom'}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{presetHint}</div>
                  </section>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetAll}
                      className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50"
                    >
                      Reset
                    </button>
                    <button
                      onClick={onDownload}
                      disabled={!outUrl}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        outUrl
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
                </div>
              ) : (
                // CUSTOM LAYOUT
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* LEFT: presets + ACTIONS */}
                  <section className="space-y-3">
                    <div className="text-sm font-medium">Preset</div>
                    <div className="flex flex-wrap gap-2">
                      {(['email', 'web', 'high', 'custom'] as const).map((p) => (
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
                          {p === 'web' && 'Web (balanced)'}
                          {p === 'high' && 'High (quality)'}
                          {p === 'custom' && 'Custom'}
                        </button>
                      ))}
                    </div>

                    {/* Actions under presets (left column) */}
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={resetAll}
                        className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50"
                      >
                        Reset
                      </button>
                      <button
                        onClick={onDownload}
                        disabled={!outUrl}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          outUrl
                            ? 'bg-black text-white'
                            : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        Download
                      </button>
                    </div>
                  </section>

                  {/* RIGHT: custom controls */}
                  <section className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="text-sm">
                        <div className="font-medium">Quality ({quality.toFixed(2)})</div>
                        <input
                          type="range"
                          min={0.5}
                          max={0.95}
                          step={0.01}
                          value={quality}
                          onChange={(e) => setQuality(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-zinc-500">
                          Lower = smaller; higher = better quality
                        </div>
                      </label>

                      <label className="text-sm">
                        <div className="font-medium">Max width (px)</div>
                        <input
                          type="number"
                          min={1}
                          value={maxWidth}
                          onChange={(e) =>
                            setMaxWidth(
                              e.target.value === '' ? '' : Math.max(1, Number(e.target.value))
                            )
                          }
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          placeholder="e.g., 1920"
                        />
                      </label>

                      <label className="text-sm">
                        <div className="font-medium">Max height (px)</div>
                        <input
                          type="number"
                          min={1}
                          value={maxHeight}
                          onChange={(e) =>
                            setMaxHeight(
                              e.target.value === '' ? '' : Math.max(1, Number(e.target.value))
                            )
                          }
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          placeholder="(optional)"
                        />
                      </label>

                      <label className="text-sm">
                        <div className="font-medium">Format</div>
                        <select
                          value={format}
                          onChange={(e) =>
                            setFormat(e.target.value as 'auto' | 'image/jpeg' | 'image/png')
                          }
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="auto">Auto (recommended)</option>
                          <option value="image/jpeg">JPEG (.jpg)</option>
                          <option value="image/png">PNG (.png)</option>
                        </select>
                        <div className="text-xs text-zinc-500 mt-1">
                          Auto keeps PNG if transparency is detected (and “Keep transparency” is
                          on).
                        </div>
                      </label>
                    </div>
                  </section>

                  {/* BOTTOM ROW: left privacy note | right checkbox */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                    <div className="text-xs text-zinc-500">
                      Private by design — processing happens in your browser.
                    </div>

                    <label className="text-sm inline-flex items-center gap-2 sm:justify-end">
                      <input
                        type="checkbox"
                        checked={keepTransparency}
                        onChange={(e) => setKeepTransparency(e.target.checked)}
                        className="align-middle"
                      />
                      <span>Keep transparency (prefer PNG when alpha is present)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
