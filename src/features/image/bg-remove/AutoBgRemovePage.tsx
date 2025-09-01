// src/features/image/bg-remove/AutoBgRemovePage.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';
import { removeBgAuto } from './autoBgRemove';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

type View = {
  originalUrl: string | null;
  resultUrl: string | null;
  file: File | null;
};

// Checkerboard to visualize transparency consistently
const checkerStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #e6e6e6 25%, transparent 25%),' +
    'linear-gradient(-45deg, #e6e6e6 25%, transparent 25%),' +
    'linear-gradient(45deg, transparent 75%, #e6e6e6 75%),' +
    'linear-gradient(-45deg, transparent 75%, #e6e6e6 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
};

export default function AutoBgRemovePage() {
  const [view, setView] = useState<View>({ originalUrl: null, resultUrl: null, file: null });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Idle');

  const inputRef = useRef<HTMLInputElement>(null);

  const addFile = useCallback((f: File) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      alert('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      alert('File is too large. Max 25 MB.');
      return;
    }

    // Revoke any existing URLs using functional update to avoid stale state
    setView((prev) => {
      if (prev.originalUrl) URL.revokeObjectURL(prev.originalUrl);
      if (prev.resultUrl) URL.revokeObjectURL(prev.resultUrl);
      return { originalUrl: URL.createObjectURL(f), resultUrl: null, file: f };
    });

    // auto start after selection
    setTimeout(() => void runAuto(f), 0);
  }, []);

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
  }, [addFile]);

  async function runAuto(file: File) {
    setBusy(true);
    setProgress(0);
    setPhase('Starting…');
    try {
      const { url } = await removeBgAuto(file, (pct, label) => {
        setProgress(pct);
        if (label) setPhase(label);
      });
      setPhase('Complete');
      setView((v) => ({ ...v, resultUrl: url }));
    } catch (e) {
      console.error(e);
      alert('Background removal failed. Try another image.');
      resetAll();
      return;
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) addFile(f);
    e.currentTarget.value = '';
  }

  function resetAll() {
    setView((prev) => {
      if (prev.originalUrl) URL.revokeObjectURL(prev.originalUrl);
      if (prev.resultUrl) URL.revokeObjectURL(prev.resultUrl);
      return { originalUrl: null, resultUrl: null, file: null };
    });
    setBusy(false);
    setProgress(0);
    setPhase('Idle');
  }

  async function onDownload() {
    if (!view.file || !view.resultUrl) return;
    const res = await fetch(view.resultUrl);
    const blob = await res.blob();
    const name = view.file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    await downloadBlob(blob, `${name}_nobg.png`);
    // Immediately clear so no images remain after download
    resetAll();
  }

  return (
    <div className="space-y-6">
      <SeoHead
        title="Remove Background — Pro Quality, Client-Side | FileTools"
        description="Upload an image and we’ll automatically remove the background in your browser. Transparent PNG export. No uploads."
        path="/remove-background"
        type="website"
        keywords="remove background, transparent png, background eraser, online"
      />

      {/* Page Title */}
      <h1 className="text-2xl font-bold">Remove Background</h1>
      <p className="text-sm text-zinc-600">
        Upload → auto process → preview. Export as <strong>transparent PNG</strong>.
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
          {!view.originalUrl ? (
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
              {/* Two containers: Original (left) and Result (right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-medium mb-2 text-zinc-700">Original</div>
                  <div className="rounded-md overflow-hidden grid place-items-center bg-white">
                    <img src={view.originalUrl} alt="Original" className="max-h-[320px] w-auto" />
                  </div>
                </section>

                <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-zinc-700">Background Removed</div>
                    {busy && <div className="text-[11px] text-zinc-500">{phase}</div>}
                  </div>

                  {/* Checkerboard preview for transparent result */}
                  <div
                    className="rounded-md overflow-hidden grid place-items-center min-h-[120px]"
                    style={checkerStyle}
                  >
                    {busy ? (
                      <div className="w-[min(90%,520px)] p-4">
                        <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="mt-2 text-center text-xs text-zinc-600">
                          {progress}% complete
                        </div>
                      </div>
                    ) : view.resultUrl ? (
                      <img
                        src={view.resultUrl}
                        alt="Background removed"
                        className="max-h-[320px] w-auto"
                      />
                    ) : (
                      <div className="text-xs text-zinc-500 py-10">No result yet</div>
                    )}
                  </div>
                </section>
              </div>

              {/* Actions — Download next to Reset */}
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAll}
                  className="px-3 py-2 rounded-lg text-sm border border-zinc-200 hover:bg-zinc-50"
                >
                  Reset
                </button>

                {!busy && view.resultUrl && (
                  <button
                    onClick={onDownload}
                    className="px-4 py-2 rounded-lg text-sm bg-black text-white"
                  >
                    Download
                  </button>
                )}
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
