// src/features/image/annotate/annotate.ts
export type Tool = 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'text';

export type RGBA = { r: number; g: number; b: number; a: number };

export type BaseShape = {
  id: string;
  stroke: string;
  fill?: string;
  strokeWidth: number;
  opacity: number;
  type: 'rect' | 'ellipse' | 'arrow' | 'pen' | 'text';
};

export type RectShape = BaseShape & {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
};

export type EllipseShape = BaseShape & {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export type ArrowShape = BaseShape & {
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrowhead: boolean;
};

export type PenShape = BaseShape & {
  type: 'pen';
  points: { x: number; y: number }[];
};

export type TextShape = BaseShape & {
  type: 'text';
  x: number; // baseline X (left)
  y: number; // baseline Y
  text: string;
  fontSize: number; // px
  fontFamily: string;
};

export type Shape = RectShape | EllipseShape | ArrowShape | PenShape | TextShape;

let _id = 0;
export function nextId(prefix = 's'): string {
  _id = (_id + 1) | 0;
  return `${prefix}${_id.toString(36)}`;
}

export type HitTarget =
  | { id: string; kind: 'body' }
  | { id: string; kind: 'handle'; which: number };

export function setCommonStyle(ctx: CanvasRenderingContext2D, s: BaseShape) {
  ctx.globalAlpha = s.opacity;
  ctx.lineWidth = s.strokeWidth;
  ctx.strokeStyle = s.stroke;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (s.fill) ctx.fillStyle = s.fill;
}

export function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

export function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  setCommonStyle(ctx, s);

  if (s.type === 'rect') {
    drawRoundRectPath(ctx, s.x, s.y, s.w, s.h, s.radius);
    if (s.fill) ctx.fill();
    ctx.stroke();
    return;
  }

  if (s.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy, Math.abs(s.rx), Math.abs(s.ry), 0, 0, Math.PI * 2);
    if (s.fill) ctx.fill();
    ctx.stroke();
    return;
  }

  if (s.type === 'arrow') {
    const { x1, y1, x2, y2 } = s;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (s.arrowhead) {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.max(8, 4 * s.strokeWidth);
      const a1 = ang + Math.PI * 0.84;
      const a2 = ang - Math.PI * 0.84;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 + Math.cos(a1) * len, y2 + Math.sin(a1) * len);
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 + Math.cos(a2) * len, y2 + Math.sin(a2) * len);
      ctx.stroke();
    }
    return;
  }

  if (s.type === 'pen') {
    if (s.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
    return;
  }

  if (s.type === 'text') {
    ctx.font = `${s.fontSize}px ${s.fontFamily}`;
    if (s.fill) {
      ctx.fillStyle = s.fill;
      ctx.globalAlpha = s.opacity;
      ctx.fillText(s.text, s.x, s.y);
    } else {
      ctx.strokeText(s.text, s.x, s.y);
    }
    return;
  }
}

// ---------- bounds + handles ----------
export function rectBounds(s: RectShape) {
  return { x: s.x, y: s.y, w: s.w, h: s.h };
}
export function ellipseBounds(s: EllipseShape) {
  return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
}
export function textBounds(s: TextShape) {
  // Very lightweight estimate; good enough for handles/grab
  const W = Math.max(40, s.text.length * (s.fontSize * 0.6));
  const H = s.fontSize * 1.2;
  return { x: s.x, y: s.y - H, w: W, h: H };
}

export function rectHandles(s: RectShape) {
  const { x, y, w, h } = s;
  return handleRects(x, y, w, h);
}
export function ellipseHandles(s: EllipseShape) {
  const { x, y, w, h } = ellipseBounds(s);
  return handleRects(x, y, w, h);
}
export function textHandles(s: TextShape) {
  const { x, y, w, h } = textBounds(s);
  return handleRects(x, y, w, h);
}

function handleRects(x: number, y: number, w: number, h: number) {
  const size = 10;
  const half = size / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pts = [
    { x: x, y: y }, // tl (0)
    { x: x + w, y: y }, // tr (1)
    { x: x + w, y: y + h }, // br (2)
    { x: x, y: y + h }, // bl (3)
    { x: cx, y: y }, // mid-top (4)
    { x: x + w, y: cy }, // mid-right (5)
    { x: cx, y: y + h }, // mid-bottom (6)
    { x: x, y: cy }, // mid-left (7)
  ];
  return pts.map((p) => ({ x: p.x - half, y: p.y - half, w: size, h: size }));
}

// ---------- hit testing ----------
export function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number) {
  return px >= x && py >= y && px <= x + w && py <= y + h;
}

export function hitTest(shapes: Shape[], x: number, y: number): HitTarget | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];

    if (s.type === 'rect') {
      const hs = rectHandles(s);
      const idx = hs.findIndex((h) => pointInRect(x, y, h.x, h.y, h.w, h.h));
      if (idx >= 0) return { id: s.id, kind: 'handle', which: idx };
      if (pointInRect(x, y, s.x, s.y, s.w, s.h)) return { id: s.id, kind: 'body' };
      continue;
    }

    if (s.type === 'ellipse') {
      const hs = ellipseHandles(s);
      const idx = hs.findIndex((h) => pointInRect(x, y, h.x, h.y, h.w, h.h));
      if (idx >= 0) return { id: s.id, kind: 'handle', which: idx };
      const { x: ex, y: ey, w, h } = ellipseBounds(s);
      if (pointInRect(x, y, ex, ey, w, h)) return { id: s.id, kind: 'body' };
      continue;
    }

    if (s.type === 'arrow') {
      const R = Math.max(6, s.strokeWidth + 4);
      if (Math.hypot(x - s.x1, y - s.y1) <= R) return { id: s.id, kind: 'handle', which: 0 };
      if (Math.hypot(x - s.x2, y - s.y2) <= R) return { id: s.id, kind: 'handle', which: 1 };
      const d = pointToSegmentDist(x, y, s.x1, s.y1, s.x2, s.y2);
      if (d <= Math.max(6, s.strokeWidth + 3)) return { id: s.id, kind: 'body' };
      continue;
    }

    if (s.type === 'pen') {
      for (let j = 0; j < s.points.length - 1; j++) {
        const a = s.points[j],
          b = s.points[j + 1];
        const d = pointToSegmentDist(x, y, a.x, a.y, b.x, b.y);
        if (d <= Math.max(6, s.strokeWidth + 3)) return { id: s.id, kind: 'body' };
      }
      continue;
    }

    if (s.type === 'text') {
      const hs = textHandles(s);
      const idx = hs.findIndex((h) => pointInRect(x, y, h.x, h.y, h.w, h.h));
      if (idx >= 0) return { id: s.id, kind: 'handle', which: idx };
      const b = textBounds(s);
      if (pointInRect(x, y, b.x, b.y, b.w, b.h)) return { id: s.id, kind: 'body' };
      continue;
    }
  }
  return null;
}

// ---------- selection drawing ----------
export function drawSelection(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2563eb';

  if (s.type === 'rect') {
    const { x, y, w, h } = s;
    ctx.strokeRect(x, y, w, h);
    drawHandles(ctx, x, y, w, h);
  } else if (s.type === 'ellipse') {
    const { x, y, w, h } = ellipseBounds(s);
    ctx.strokeRect(x, y, w, h);
    drawHandles(ctx, x, y, w, h);
  } else if (s.type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    drawHandleDot(ctx, s.x1, s.y1);
    drawHandleDot(ctx, s.x2, s.y2);
  } else if (s.type === 'pen') {
    const b = penBounds(s);
    if (b) ctx.strokeRect(b.x, b.y, b.w, b.h);
  } else if (s.type === 'text') {
    const { x, y, w, h } = textBounds(s);
    ctx.strokeRect(x, y, w, h);
    drawHandles(ctx, x, y, w, h);
  }

  ctx.restore();
}

function drawHandles(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const hs = handleRects(x, y, w, h);
  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2563eb';
  for (const hnd of hs) {
    ctx.fillRect(hnd.x, hnd.y, hnd.w, hnd.h);
    ctx.strokeRect(hnd.x, hnd.y, hnd.w, hnd.h);
  }
  ctx.restore();
}

function drawHandleDot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2563eb';
  ctx.stroke();
  ctx.restore();
}

export function penBounds(s: PenShape) {
  if (!s.points.length) return null;
  let minX = s.points[0].x,
    minY = s.points[0].y,
    maxX = minX,
    maxY = minY;
  for (const p of s.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// distance from point to line segment
function pointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const vx = x2 - x1,
    vy = y2 - y1;
  const wx = px - x1,
    wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const b = c1 / c2;
  const bx = x1 + b * vx,
    by = y1 + b * vy;
  return Math.hypot(px - bx, py - by);
}
