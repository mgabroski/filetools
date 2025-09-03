import type { Aspect, TemplateId } from './collage';

export const ASPECTS: Record<Aspect, number> = {
  square: 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '3:2': 3 / 2,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

export const TEMPLATE_OPTIONS: { id: TemplateId; label: string }[] = [
  { id: 'auto', label: 'Auto Grid' },
  { id: '2x2', label: '2×2' },
  { id: '3x3', label: '3×3' },
  { id: '4x4', label: '4×4' },
  { id: '3x2', label: '3×2' },
  { id: '2x3', label: '2×3' },
  { id: 'film-strip', label: 'Film Strip' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'heart', label: 'Heart' },
];

// Pick rows/cols for a template. Heart uses a dense square grid behind a mask.
export function gridForTemplate(tpl: TemplateId, n: number): { rows: number; cols: number } {
  switch (tpl) {
    case '2x2':
      return { rows: 2, cols: 2 };
    case '3x3':
      return { rows: 3, cols: 3 };
    case '4x4':
      return { rows: 4, cols: 4 };
    case '3x2':
      return { rows: 3, cols: 2 };
    case '2x3':
      return { rows: 2, cols: 3 };
    case 'film-strip':
    case 'polaroid':
      return { rows: 1, cols: Math.max(2, n) };
    case 'heart': {
      if (n <= 4) return { rows: 2, cols: 2 };
      if (n <= 9) return { rows: 3, cols: 3 };
      return { rows: 4, cols: 4 };
    }
    case 'auto':
    default: {
      const s = Math.ceil(Math.sqrt(Math.max(1, n)));
      return { rows: s, cols: s };
    }
  }
}
