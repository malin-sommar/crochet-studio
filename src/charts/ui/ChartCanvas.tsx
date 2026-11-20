import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { lineCells, setCell } from '../edit';
import type { ChartContent } from '../model';
import { checkMosaic } from '../mosaic';
import { canvasScale, chartPixelSize, drawChart, drawThumbnail } from './drawChart';

/** Re-renders when the theme (light/dark) changes, so canvases can redraw in the new colors. */
function useThemeVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver(() => setV((x) => x + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return v;
}

function themeColors(el: Element): { bg: string; ink: string } {
  const s = getComputedStyle(el);
  return {
    bg: s.getPropertyValue('--surface').trim() || '#ffffff',
    ink: s.getPropertyValue('--ink').trim() || '#2a2228',
  };
}

interface Props {
  chart: ChartContent;
  zoom: number;
  mode: 'edit' | 'crochet';
  tool?: 'paint' | 'scroll';
  active?: number;
  /** Edit mode: called once per brush stroke, with the new squares. */
  onStroke?: (cells: string[]) => void;
  /** Crochet mode: called with the row number that was tapped. */
  onRowTap?: (n: number) => void;
  /** Keep this row (1 = bottom) scrolled into view. */
  focusRow?: number;
  label: string;
}

export function ChartCanvas({ chart, zoom, mode, tool = 'paint', active = 1, onStroke, onRowTap, focusRow, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<{ cells: string[]; value: string; last: { x: number; y: number } } | null>(null);
  const themeVersion = useThemeVersion();
  const bad = useMemo(() => (chart.tech === 'mosaic' ? checkMosaic(chart).bad : null), [chart]);
  const painting = mode === 'edit' && tool === 'paint';

  const redraw = (c: ChartContent) => {
    const cv = canvas.current;
    if (!cv) return;
    const { width, height } = chartPixelSize(c, zoom);
    const scale = canvasScale(width, height, window.devicePixelRatio || 1);
    cv.style.width = `${width}px`;
    cv.style.height = `${height}px`;
    cv.width = Math.round(width * scale);
    cv.height = Math.round(height * scale);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawChart(ctx, c, { cs: zoom, mode, bad, ...themeColors(cv) });
  };

  useLayoutEffect(() => {
    if (!stroke.current) redraw(chart);
  }, [chart, zoom, mode, bad, themeVersion]);

  // Keep the current row in view (crochet mode)
  useEffect(() => {
    const b = box.current;
    if (!b || !focusRow) return;
    const rowTop = (chart.h - focusRow) * zoom;
    const target = rowTop - b.clientHeight / 2 + zoom / 2;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    b.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
  }, [focusRow, zoom, chart.h]);

  const cellAt = (e: PointerEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / zoom);
    const y = Math.floor((e.clientY - r.top) / zoom);
    return { x, y, ok: x >= 0 && x < chart.w && y >= 0 && y < chart.h };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!painting || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = cellAt(e);
    if (!p.ok) return;
    const a = String(active);
    const value = chart.cells[p.y]![p.x] === a ? '0' : a;
    stroke.current = { cells: setCell(chart.cells, p.y, p.x, Number(value)), value, last: { x: p.x, y: p.y } };
    e.currentTarget.setPointerCapture(e.pointerId);
    redraw({ ...chart, cells: stroke.current.cells });
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = stroke.current;
    if (!s) return;
    const p = cellAt(e);
    if (!p.ok || (p.x === s.last.x && p.y === s.last.y)) return;
    // A fast finger can jump several squares between two events: fill in the squares in between.
    for (const q of lineCells(s.last, p)) s.cells = setCell(s.cells, q.y, q.x, Number(s.value));
    s.last = { x: p.x, y: p.y };
    redraw({ ...chart, cells: s.cells });
  };

  const endStroke = () => {
    const s = stroke.current;
    if (!s) return;
    stroke.current = null;
    onStroke?.(s.cells);
  };

  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'crochet' || !onRowTap) return;
    const p = cellAt(e);
    if (p.ok) onRowTap(chart.h - p.y);
  };

  return (
    <div ref={box} className={`gridbox ${mode === 'crochet' ? 'gridbox-crochet' : ''}`}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className={painting ? 'paint' : 'pan'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onClick={onClick}
      />
    </div>
  );
}

/** A small picture of a chart, one pixel per square, scaled up sharply by CSS. */
export function ChartThumb({ chart, size = 88 }: { chart: ChartContent; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) drawThumbnail(ctx, chart);
  }, [chart]);
  const k = size / Math.max(chart.w, chart.h);
  return (
    <canvas
      ref={ref}
      width={chart.w}
      height={chart.h}
      className="thumb"
      style={{ width: chart.w * k, height: chart.h * k }}
      aria-hidden="true"
    />
  );
}
