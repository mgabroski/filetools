export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeDims = {
  width: number;
  height: number;
};

export async function cropResizeImage(
  file: File,
  crop: CropRect,
  resize: ResizeDims,
  format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = resize.width;
        canvas.height = resize.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        if (format === 'image/jpeg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          Math.max(0, crop.x),
          Math.max(0, crop.y),
          Math.max(1, crop.width),
          Math.max(1, crop.height),
          0,
          0,
          resize.width,
          resize.height
        );

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Failed to export image'));
          },
          format,
          quality
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
