// Shared types for Collage Maker

export type TemplateId =
  | 'auto'
  | '2x2'
  | '3x3'
  | '4x4'
  | '3x2'
  | '2x3'
  | 'film-strip'
  | 'polaroid'
  | 'heart';

export type FitMode = 'fill' | 'fit'; // fill = cover (may crop), fit = contain (no crop)
export type FillPolicy = 'blank' | 'repeat'; // blank = leave extra cells empty; repeat = cycle images

export type Aspect = 'square' | '4:5' | '3:4' | '3:2' | '4:3' | '16:9';

export type CollageOptions = {
  template: TemplateId;
  outputWidth: number; // px
  aspect: Aspect;
  spacing: number; // px (outer margin + gutters)
  cornerRadius: number; // px (rounded tiles)
  bg: string; // canvas background (CSS color)
  fit: FitMode;
  format: 'image/png' | 'image/jpeg';
  quality: number; // 0..1 (ignored for PNG)
  fillPolicy: FillPolicy;
  onProgress?: (pct: number) => void;
};
