// src/features/image/bg-remove/autoBgRemove.ts
import { removeBackground, preload, type Config } from '@imgly/background-removal';

export type RemoveBgProgress = (pct: number, label?: string) => void;

export type RemoveBgOutput = {
  blob: Blob;
  url: string;
  score: number; // placeholder 0..100
};

let preloaded = false;

export async function removeBgPreload(): Promise<void> {
  if (preloaded) return;
  const cfg: Config = {
    device: 'gpu',
    model: 'isnet_fp16',
    output: { format: 'image/png' },
  };
  await preload(cfg);
  preloaded = true;
}

export async function removeBgAuto(
  file: File,
  onProgress?: RemoveBgProgress
): Promise<RemoveBgOutput> {
  let p = 0;
  const set = (v: number, msg?: string) => {
    p = Math.max(p, Math.min(100, Math.round(v)));
    onProgress?.(p, msg);
  };

  const cfg: Config = {
    device: 'gpu',
    model: 'isnet_fp16',
    output: { format: 'image/png' },
    // Explicit types to satisfy ESLint/TS
    progress: (_stage: string, loaded: number, total: number) => {
      if (!total) return;
      const pct = 35 * (loaded / total); // map downloads to 0..35%
      set(pct, 'Downloading model…');
    },
  };

  set(5, 'Preparing…');
  let ticking = true;
  const spinner = setInterval(() => {
    if (!ticking) return;
    if (p < 90) set(p + 1, 'Processing…');
  }, 80);

  try {
    const blob = await removeBackground(file, cfg);
    clearInterval(spinner);
    ticking = false;
    set(96, 'Finalizing…');
    const url = URL.createObjectURL(blob);
    set(100, 'Done');
    return { blob, url, score: 100 };
  } catch (e) {
    clearInterval(spinner);
    ticking = false;
    throw e;
  }
}
