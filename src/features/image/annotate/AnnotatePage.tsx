import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Circle,
  Download,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Type as TypeIcon,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { SeoHead } from '../../../components/seo/SeoHead';
import { downloadBlob } from '../../../utils/download';

import type {
  ArrowShape,
  EllipseShape,
  HitTarget,
  PenShape,
  RectShape,
  Shape,
  TextShape,
  Tool,
} from './annotate';
import { drawSelection, drawShape, ellipseBounds, hitTest, nextId, textBounds } from './annotate';

type DragState =
  | { mode: 'none' }
  | {
      mode: 'creating';
      tool: Exclude<Tool, 'select'>;
      startX: number;
      startY: number;
      tempId: string;
    }
  | {
      mode: 'moving';
      id: string;
      startX: number;
      startY: number;
      orig: Shape;
    }
  | {
      mode: 'resizing';
      id: string;
      startX: number;
      startY: number;
      which: number; // 0..7 for rect/ellipse/text, 0/1 for arrow
      orig: Shape;
    }
  | {
      mode: 'pen';
      id: string;
    };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function resizeRectWithHandle(orig: RectShape, which: number, dx: number, dy: number): RectShape {
  let { x, y, w, h } = orig;

  switch (which) {
    case 0: // tl
      x += dx;
      y += dy;
      w -= dx;
      h -= dy;
      break;
    case 1: // tr
      y += dy;
      w += dx;
      h -= dy;
      break;
    case 2: // br
      w += dx;
      h += dy;
      break;
    case 3: // bl
      x += dx;
      w -= dx;
      h += dy;
      break;
    case 4: // mid-top
      y += dy;
      h -= dy;
      break;
    case 5: // mid-right
      w += dx;
      break;
    case 6: // mid-bottom
      h += dy;
      break;
    case 7: // mid-left
      x += dx;
      w -= dx;
      break;
  }

  // Normalize so w,h are positive
  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }

  return { ...orig, x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

function resizeEllipseWithHandle(
  orig: EllipseShape,
  which: number,
  dx: number,
  dy: number
): EllipseShape {
  // Convert to rect bounds, resize, then back
  const b = ellipseBounds(orig); // {x,y,w,h}
  const tmp: RectShape = {
    id: orig.id,
    type: 'rect',
    x: b.x,
    y: b.y,
    w: b.w,
    h: b.h,
    radius: 0,
    stroke: orig.stroke,
    strokeWidth: orig.strokeWidth,
    opacity: orig.opacity,
    fill: orig.fill,
  };
  const r = resizeRectWithHandle(tmp, which, dx, dy);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rx = r.w / 2;
  const ry = r.h / 2;
  return { ...orig, cx, cy, rx, ry };
}

function resizeTextWithHandle(orig: TextShape, which: number, dx: number, dy: number): TextShape {
  const b0 = textBounds(orig); // {x,y,w,h}
  let x = b0.x,
    y = b0.y,
    w = b0.w,
    h = b0.h;

  switch (which) {
    case 0:
      x += dx;
      y += dy;
      w -= dx;
      h -= dy;
      break; // TL
    case 1:
      y += dy;
      w += dx;
      h -= dy;
      break; // TR
    case 2:
      w += dx;
      h += dy;
      break; // BR
    case 3:
      x += dx;
      w -= dx;
      h += dy;
      break; // BL
    case 4:
      y += dy;
      h -= dy;
      break; // MT
    case 5:
      w += dx;
      break; // MR
    case 6:
      h += dy;
      break; // MB
    case 7:
      x += dx;
      w -= dx;
      break; // ML
  }

  w = Math.max(8, w);
  h = Math.max(8, h);

  const sx = w / b0.w;
  const sy = h / b0.h;
  const s = clamp(isFinite(Math.max(sx, sy)) ? Math.max(sx, sy) : 1, 0.1, 10);

  const newFont = clamp(Math.round(orig.fontSize * s), 6, 400);
  const newH = newFont * 1.2;

  // Baseline-left anchor: baseline y = top + height
  const newX = x;
  const newY = y + newH;

  return { ...orig, x: newX, y: newY, fontSize: newFont };
}

export default function AnnotatePage() {
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // Canvas size (display)
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 800, h: 450 });

  // Tools / shapes
  const [tool, setTool] = useState<Tool>('select');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => shapes.find((s) => s.id === selectedId) || null,
    [shapes, selectedId]
  );

  // Style defaults
  const [stroke, setStroke] = useState('#ef4444'); // red-500 default
  const [fill, setFill] = useState<string>(''); // '' means none
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [arrowhead] = useState(true);
  const [textValue, setTextValue] = useState('Text');
  const [textSize, setTextSize] = useState(36);
  const [textFont, setTextFont] = useState(
    'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
  );

  // Drag / pointer
  const [drag, setDrag] = useState<DragState>({ mode: 'none' });

  // Busy export overlay
  const [busy, setBusy] = useState<{ on: boolean; label: string; pct?: number }>({
    on: false,
    label: 'Idle',
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ------------------ layout & image load ------------------

  useEffect(() => {
    const onResize = () => {
      if (!natural || !wrapRef.current) return;
      const wrapW = wrapRef.current.clientWidth;
      const maxW = Math.min(wrapW - 24, 1100);
      const aspect = natural.w / natural.h;
      const w = Math.max(320, Math.min(maxW, 1000));
      const h = Math.round(w / aspect);
      setCanvasSize({ w, h });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [natural]);

  function addFile(f: File) {
    if (!/^image\//i.test(f.type)) {
      alert('Please choose an image file (PNG/JPG/WebP).');
      return;
    }
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setSrcUrl(url);
      setShapes([]);
      setSelectedId(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Failed to load image.');
    };
    img.src = url;
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) addFile(f);
    e.currentTarget.value = '';
  }

  // ------------------ canvas draw ------------------

  // preview draw
  useEffect(() => {
    const cvs = canvasRef.current;
    const img = imgRef.current;
    if (!cvs || !img) return;
    cvs.width = canvasSize.w;
    cvs.height = canvasSize.h;
    const ctx = cvs.getContext('2d')!;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // draw image scaled
    ctx.drawImage(img, 0, 0, cvs.width, cvs.height);

    // draw shapes
    for (const s of shapes) drawShape(ctx, s);

    // selection
    const sel = shapes.find((s) => s.id === selectedId);
    if (sel) drawSelection(ctx, sel);
  }, [canvasSize.w, canvasSize.h, shapes, selectedId, srcUrl]);

  // ------------------ pointer handlers ------------------

  function viewToCanvas(ev: React.PointerEvent<HTMLCanvasElement>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    return { x, y };
  }

  function onPointerDown(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!srcUrl) return;
    (ev.currentTarget as HTMLCanvasElement).setPointerCapture(ev.pointerId);
    const { x, y } = viewToCanvas(ev);

    const ht: HitTarget | null = hitTest(shapes, x, y);

    if (tool === 'select') {
      if (ht) {
        setSelectedId(ht.id);
        if (ht.kind === 'handle') {
          const orig = shapes.find((s) => s.id === ht.id)!;
          setDrag({ mode: 'resizing', id: ht.id, startX: x, startY: y, which: ht.which, orig });
        } else {
          const orig = shapes.find((s) => s.id === ht.id)!;
          setDrag({ mode: 'moving', id: ht.id, startX: x, startY: y, orig });
        }
      } else {
        setSelectedId(null);
      }
      return;
    }

    // non-select tools:
    if (tool === 'pen') {
      const id = nextId('pen');
      const p: PenShape = {
        id,
        type: 'pen',
        points: [{ x, y }],
        stroke,
        strokeWidth,
        opacity,
      };
      setShapes((prev) => [...prev, p]);
      setSelectedId(id);
      setDrag({ mode: 'pen', id });
      return;
    }

    if (tool === 'text') {
      const id = nextId('txt');
      const t: TextShape = {
        id,
        type: 'text',
        x,
        y,
        text: textValue || 'Text',
        fontSize: textSize,
        fontFamily: textFont,
        stroke: stroke,
        strokeWidth: 1,
        opacity,
        fill: fill || stroke, // prefer fill for text
      };
      setShapes((prev) => [...prev, t]);
      setSelectedId(id);
      // allow immediate move with select
      setTool('select');
      return;
    }

    // rect / ellipse / arrow creation
    const id = nextId('s');
    let temp: Shape;

    if (tool === 'rect') {
      temp = {
        id,
        type: 'rect',
        x,
        y,
        w: 1,
        h: 1,
        radius: 8,
        stroke,
        fill: fill || undefined,
        strokeWidth,
        opacity,
      };
    } else if (tool === 'ellipse') {
      temp = {
        id,
        type: 'ellipse',
        cx: x,
        cy: y,
        rx: 1,
        ry: 1,
        stroke,
        fill: fill || undefined,
        strokeWidth,
        opacity,
      };
    } else {
      // arrow
      temp = {
        id,
        type: 'arrow',
        x1: x,
        y1: y,
        x2: x + 1,
        y2: y + 1,
        arrowhead,
        stroke,
        strokeWidth,
        opacity,
      };
    }

    setShapes((prev) => [...prev, temp]);
    setSelectedId(id);
    setDrag({
      mode: 'creating',
      tool: tool as Exclude<Tool, 'select'>,
      startX: x,
      startY: y,
      tempId: id,
    });
  }

  function onPointerMove(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (drag.mode === 'none') return;
    const { x, y } = viewToCanvas(ev);

    if (drag.mode === 'pen') {
      setShapes((prev) =>
        prev.map((s) =>
          s.id === drag.id && s.type === 'pen' ? { ...s, points: [...s.points, { x, y }] } : s
        )
      );
      return;
    }

    if (drag.mode === 'creating') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== drag.tempId) return s;
          if (drag.tool === 'rect' && s.type === 'rect') {
            let nx = s.x,
              ny = s.y,
              nw = dx,
              nh = dy;
            if (nw < 0) {
              nx += nw;
              nw = -nw;
            }
            if (nh < 0) {
              ny += nh;
              nh = -nh;
            }
            return { ...s, x: nx, y: ny, w: Math.max(1, nw), h: Math.max(1, nh) };
          }
          if (drag.tool === 'ellipse' && s.type === 'ellipse') {
            return {
              ...s,
              cx: drag.startX + dx / 2,
              cy: drag.startY + dy / 2,
              rx: Math.abs(dx / 2),
              ry: Math.abs(dy / 2),
            };
          }
          if (drag.tool === 'arrow' && s.type === 'arrow') {
            return { ...s, x2: drag.startX + dx, y2: drag.startY + dy };
          }
          return s;
        })
      );
      return;
    }

    if (drag.mode === 'moving') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== drag.id) return s;
          const o = drag.orig;
          if (s.type === 'rect' && o.type === 'rect') {
            return { ...s, x: o.x + dx, y: o.y + dy };
          }
          if (s.type === 'ellipse' && o.type === 'ellipse') {
            return { ...s, cx: o.cx + dx, cy: o.cy + dy };
          }
          if (s.type === 'arrow' && o.type === 'arrow') {
            return { ...s, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy };
          }
          if (s.type === 'pen' && o.type === 'pen') {
            const pts = o.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            return { ...s, points: pts };
          }
          if (s.type === 'text' && o.type === 'text') {
            return { ...s, x: o.x + dx, y: o.y + dy };
          }
          return s;
        })
      );
      return;
    }

    if (drag.mode === 'resizing') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      const { which } = drag;

      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== drag.id) return s;
          const o = drag.orig;
          if (s.type === 'rect' && o.type === 'rect') {
            return resizeRectWithHandle(o, which, dx, dy);
          }
          if (s.type === 'ellipse' && o.type === 'ellipse') {
            return resizeEllipseWithHandle(o, which, dx, dy);
          }
          if (s.type === 'arrow' && o.type === 'arrow') {
            if (which === 0) return { ...s, x1: o.x1 + dx, y1: o.y1 + dy };
            return { ...s, x2: o.x2 + dx, y2: o.y2 + dy };
          }
          if (s.type === 'text' && o.type === 'text') {
            return resizeTextWithHandle(o, which, dx, dy);
          }
          return s;
        })
      );
    }
  }

  function onPointerUp(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (drag.mode !== 'none') setDrag({ mode: 'none' });
    (ev.currentTarget as HTMLCanvasElement).releasePointerCapture(ev.pointerId);
  }

  // ------------------ delete keyboard ------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setShapes((prev) => prev.filter((s) => s.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // ------------------ export ------------------

  async function onDownload() {
    if (!imgRef.current || !natural) {
      alert('Please choose an image first.');
      return;
    }
    setBusy({ on: true, label: 'Exporting…', pct: 80 });

    try {
      const off = document.createElement('canvas');
      off.width = natural.w;
      off.height = natural.h;
      const ctx = off.getContext('2d')!;
      ctx.clearRect(0, 0, off.width, off.height);

      // draw base image
      ctx.drawImage(imgRef.current, 0, 0, off.width, off.height);

      // scale factor from preview -> natural
      const scaleX = natural.w / canvasSize.w;
      const scaleY = natural.h / canvasSize.h;

      // draw shapes scaled
      ctx.save();
      ctx.scale(scaleX, scaleY);
      for (const s of shapes) drawShape(ctx, s);
      ctx.restore();

      const blob = await new Promise<Blob>((resolve) =>
        off.toBlob((b) => resolve(b || new Blob()), 'image/png')
      );
      await downloadBlob(blob, 'annotated.png');
    } catch (e) {
      console.error(e);
      alert('Export failed. Try again.');
    } finally {
      setBusy({ on: false, label: 'Idle' });
    }
  }

  // ------------------ UI helpers ------------------

  function applyStyleToSelected(patch: Partial<Shape>) {
    if (!selected) return;
    setShapes((prev) =>
      prev.map((s) => (s.id === selected.id ? ({ ...s, ...patch } as Shape) : s))
    );
  }

  // ------------------ render ------------------

  return (
    <div className="space-y-6">
      <SeoHead
        title="Annotate Image — Boxes, Arrows, Text (Private) | FileTools"
        description="Draw rectangles, circles, arrows, freehand or add text on images — right in your browser. Export PNG with no upload."
        path="/annotate"
        type="website"
        keywords="annotate image, draw on image, add text to image, arrow on screenshot"
      />

      {busy.on && (
        <div className="fixed inset-0 z-30 bg-black/50 grid place-items-center">
          <div className="rounded-2xl bg-white p-6 w-[min(92vw,560px)] shadow-lg">
            <h2 className="text-xl font-semibold text-center">{busy.label}</h2>
            <p className="text-center text-sm text-zinc-600 mt-1">Please wait…</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${busy.pct ?? 80}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">Annotate Image</h1>
      <p className="text-sm text-zinc-600">
        Upload an image, choose a tool, draw/edit, then download. Delete a shape with{' '}
        <kbd className="px-1 py-0.5 border rounded">Delete</kbd>/
        <kbd className="px-1 py-0.5 border rounded">Backspace</kbd>.
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

        <CardContent>
          {!srcUrl ? (
            <div
              className="border border-dashed border-zinc-300 rounded-xl p-8 text-center text-sm text-zinc-600"
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              Drag &amp; drop an image here, or click{' '}
              <span className="underline">Choose Image</span>.
              <div className="mt-2 text-xs text-zinc-500">PNG, JPG, or WebP</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
              {/* Left panel: tools & style */}
              <section className="space-y-6">
                {/* Tools with icons */}
                <div>
                  <div className="text-sm font-medium mb-2">Tools</div>
                  <div className="flex flex-wrap gap-2">
                    <ToolBtn
                      active={tool === 'select'}
                      onClick={() => setTool('select')}
                      icon={<MousePointer2 size={16} />}
                      label="Select"
                    />
                    <ToolBtn
                      active={tool === 'rect'}
                      onClick={() => setTool('rect')}
                      icon={<Square size={16} />}
                      label="Rectangle"
                    />
                    <ToolBtn
                      active={tool === 'ellipse'}
                      onClick={() => setTool('ellipse')}
                      icon={<Circle size={16} />}
                      label="Ellipse"
                    />
                    <ToolBtn
                      active={tool === 'arrow'}
                      onClick={() => setTool('arrow')}
                      icon={<ArrowRight size={16} />}
                      label="Arrow"
                    />
                    <ToolBtn
                      active={tool === 'pen'}
                      onClick={() => setTool('pen')}
                      icon={<Pencil size={16} />}
                      label="Pen"
                    />
                    <ToolBtn
                      active={tool === 'text'}
                      onClick={() => setTool('text')}
                      icon={<TypeIcon size={16} />}
                      label="Text"
                    />
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Style</div>

                  <label className="text-sm flex items-center justify-between gap-3">
                    <span>Stroke</span>
                    <input
                      type="color"
                      value={stroke}
                      onChange={(e) => {
                        setStroke(e.target.value);
                        if (selected) applyStyleToSelected({ stroke: e.target.value });
                      }}
                    />
                  </label>

                  <label className="text-sm flex items-center justify-between gap-3">
                    <span>Fill</span>
                    <input
                      type="color"
                      value={fill || '#ffffff'}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFill(v);
                        if (selected) applyStyleToSelected({ fill: v });
                      }}
                    />
                  </label>

                  <label className="text-sm">
                    <div className="flex items-center justify-between">
                      <span>Stroke width</span>
                      <span className="text-xs text-zinc-500">{strokeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={24}
                      value={strokeWidth}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setStrokeWidth(v);
                        if (selected) applyStyleToSelected({ strokeWidth: v });
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="text-sm">
                    <div className="flex items-center justify-between">
                      <span>Opacity</span>
                      <span className="text-xs text-zinc-500">{opacity.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.01}
                      value={opacity}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setOpacity(v);
                        if (selected) applyStyleToSelected({ opacity: v });
                      }}
                      className="w-full"
                    />
                  </label>

                  {selected?.type === 'arrow' && (
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(selected as ArrowShape).arrowhead}
                        onChange={(e) =>
                          applyStyleToSelected({
                            arrowhead: e.target.checked,
                          } as Partial<ArrowShape>)
                        }
                      />
                      <span>Arrowhead</span>
                    </label>
                  )}

                  {/* Text controls */}
                  {tool === 'text' || selected?.type === 'text' ? (
                    <div className="space-y-2">
                      <label className="text-sm">
                        <div className="font-medium">Text</div>
                        <input
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          value={
                            selected?.type === 'text' ? (selected as TextShape).text : textValue
                          }
                          onChange={(e) => {
                            if (selected?.type === 'text') {
                              applyStyleToSelected({ text: e.target.value } as Partial<TextShape>);
                            } else {
                              setTextValue(e.target.value);
                            }
                          }}
                        />
                      </label>

                      <label className="text-sm">
                        <div className="font-medium">Font size (px)</div>
                        <input
                          type="number"
                          min={6}
                          max={400}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          value={
                            selected?.type === 'text' ? (selected as TextShape).fontSize : textSize
                          }
                          onChange={(e) => {
                            const v = clamp(parseInt(e.target.value || '0', 10), 6, 400);
                            if (selected?.type === 'text') {
                              applyStyleToSelected({ fontSize: v } as Partial<TextShape>);
                            } else {
                              setTextSize(v);
                            }
                          }}
                        />
                      </label>

                      <label className="text-sm">
                        <div className="font-medium">Font family</div>
                        <input
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          value={
                            selected?.type === 'text'
                              ? (selected as TextShape).fontFamily
                              : textFont
                          }
                          onChange={(e) => {
                            if (selected?.type === 'text') {
                              applyStyleToSelected({
                                fontFamily: e.target.value,
                              } as Partial<TextShape>);
                            } else {
                              setTextFont(e.target.value);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (!selectedId) return;
                        setShapes((prev) => prev.filter((s) => s.id !== selectedId));
                        setSelectedId(null);
                      }}
                      disabled={!selectedId}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        selectedId
                          ? 'border-zinc-200 hover:bg-zinc-50'
                          : 'border-zinc-200 text-zinc-400 cursor-not-allowed'
                      } flex items-center gap-2`}
                      title="Delete (Backspace/Delete)"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>

                    <button
                      onClick={onDownload}
                      className="px-3 py-2 rounded-lg text-sm bg-black text-white flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>

                  <div className="text-xs text-zinc-500">
                    Private by design — processing happens in your browser.
                  </div>
                </div>
              </section>

              {/* Right: canvas */}
              <section className="space-y-2">
                <div className="text-sm font-medium">Canvas</div>
                <div ref={wrapRef} className="rounded-lg border border-zinc-200 bg-white p-2">
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.w}
                    height={canvasSize.h}
                    className="w-full h-auto touch-none"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                  />
                </div>
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --------------- small UI component ----------------

function ToolBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 ${
        active ? 'bg-black text-white border-black' : 'bg-white text-zinc-800 border-zinc-200'
      }`}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
