import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';
import { cropResizeImage, type CropRect } from './cropResize';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_RES = 4096;
type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

function baseName(name: string) {
  return name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
}
function clampDim(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, MAX_RES);
}
function centeredAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  const crop = makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight);
  return centerCrop(crop, mediaWidth, mediaHeight);
}

type AspectMode = 'free' | '1:1' | '4:3' | '16:9';

export default function CropResizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 5, y: 5, width: 90, height: 90 });

  const [mode, setMode] = useState<AspectMode>('free');

  const [format, setFormat] = useState<ImageFormat>('image/jpeg');
  const [quality, setQuality] = useState(0.92);

  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function addFile(f: File) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      alert('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      alert('File is too large. Max 25 MB.');
      return;
    }
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
  }
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) addFile(f);
    e.currentTarget.value = '';
  }

  const aspect = useMemo(() => {
    if (mode === 'free') return undefined;
    if (mode === '1:1') return 1;
    if (mode === '4:3') return 4 / 3;
    if (mode === '16:9') return 16 / 9;
  }, [mode]);

  const realignCrop = useCallback((img: HTMLImageElement, asp?: number) => {
    if (asp) {
      const c = centeredAspectCrop(img.naturalWidth, img.naturalHeight, asp);
      setCrop(c);
    } else {
      setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
    }
  }, []);

  const onImageLoaded = useCallback(
    (img: HTMLImageElement) => {
      imgRef.current = img;
      realignCrop(img, aspect);
    },
    [aspect, realignCrop]
  );

  useEffect(() => {
    if (imgRef.current) realignCrop(imgRef.current, aspect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, mode]);

  async function onExport() {
    if (!file || !imgRef.current) return;

    // pixel crop
    const pixel = convertToPixelCrop(
      crop,
      imgRef.current.naturalWidth,
      imgRef.current.naturalHeight
    );

    const srcRect: CropRect = {
      x: Math.round(pixel.x),
      y: Math.round(pixel.y),
      width: Math.round(pixel.width),
      height: Math.round(pixel.height),
    };

    const W = clampDim(srcRect.width);
    const H = clampDim(srcRect.height);

    setBusy(true);
    try {
      const blob = await cropResizeImage(
        file,
        srcRect,
        { width: W, height: H },
        format,
        format === 'image/png' ? undefined : quality
      );
      const name = baseName(file.name);
      const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
      await downloadBlob(blob, `${name}_crop.${ext}`);
      resetAll();
    } catch (e) {
      console.error(e);
      alert('Failed to process image. Try a different selection or format.');
    } finally {
      setBusy(false);
    }
  }

  function resetAll() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
    setMode('free');
    setFormat('image/jpeg');
    setQuality(0.92);
  }

  return (
    <div className="space-y-6">
      <SeoHead
        title="Crop Image — Free Online, Private | FileTools"
        description="Quickly crop images in your browser. Drag any edge/corner. Presets: Free, 1:1, 4:3, 16:9. No uploads."
        path="/crop-resize"
        type="website"
        keywords="crop image, 1:1 crop, 16:9 crop, online image cropper"
      />

      {busy && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,520px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">Processing…</h2>
            <p className="text-center text-sm text-zinc-600 mt-1">Please wait…</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: '88%' }} />
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">Crop Image</h1>
      <p className="text-sm text-zinc-600">
        Drag from any edge or corner to adjust. Pick a preset aspect or use <strong>Free</strong>.
      </p>

      {/* same main container style as other tools (no extra page max-width wrapper) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Upload</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm cursor-pointer">
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
          {!imageUrl ? (
            <div
              className="border border-dashed border-zinc-300 rounded-xl p-8 text-center text-sm text-zinc-600"
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              Drag &amp; drop an image here, or click{' '}
              <span className="underline">Choose Image</span>.
              <div className="mt-2 text-xs text-zinc-500">Limits: ≤ 25 MB • JPG, PNG, WebP</div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* SMALLER preview/crop area (width & height capped) */}
              <div className="bg-zinc-100 rounded-md overflow-hidden p-3 border border-zinc-200 max-w-[460px] mx-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  aspect={aspect}
                  keepSelection
                  ruleOfThirds
                  minWidth={10}
                  minHeight={10}
                >
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="To crop"
                    onLoad={(e) => onImageLoaded(e.currentTarget)}
                    className="max-h-[240px] mx-auto w-auto"
                  />
                </ReactCrop>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aspect presets only */}
                <section className="space-y-2">
                  <div className="text-sm font-medium">Aspect</div>
                  <div className="flex flex-wrap gap-2">
                    {(['free', '1:1', '4:3', '16:9'] as AspectMode[]).map((m) => (
                      <button
                        key={m}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${
                          mode === m
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-zinc-800 border-zinc-200'
                        }`}
                        onClick={() => setMode(m)}
                      >
                        {m === 'free' ? 'Free' : m}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Format & quality */}
                <section className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-sm">
                      <div className="font-medium">Format</div>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as ImageFormat)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="image/jpeg">JPEG (.jpg)</option>
                        <option value="image/png">PNG (.png)</option>
                        <option value="image/webp">WebP (.webp)</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <div className="font-medium">
                        Quality {format === 'image/png' ? '(n/a)' : `(${quality.toFixed(2)})`}
                      </div>
                      <input
                        type="range"
                        min={0.4}
                        max={0.98}
                        step={0.01}
                        disabled={format === 'image/png'}
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-full disabled:opacity-50"
                      />
                      <div className="text-xs text-zinc-500">
                        {format === 'image/png'
                          ? 'PNG is lossless; quality is ignored by most browsers.'
                          : 'Lower quality reduces file size. 0.6–0.9 is a good range.'}
                      </div>
                    </label>
                  </div>
                </section>
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
                  onClick={onExport}
                  className="px-4 py-2 rounded-lg text-sm bg-black text-white"
                >
                  Download
                </button>
              </div>

              <div className="text-xs text-zinc-500">
                Private by design — processing happens in your browser.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
