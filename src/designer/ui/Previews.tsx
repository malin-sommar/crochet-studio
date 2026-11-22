import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getStitch } from '../../stitches/data';
import { drawRowList, type SwatchRow } from '../../stitches/swatch';
import { SwatchSvg } from '../../stitches/ui/SwatchView';
import type { DesignContent } from '../model';
import { designPattern } from '../patterns';
import type { Plan, PlannedRow } from '../plan';
import type { Size } from '../measure';

function shade(hex: string, amount: number): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const to = amount < 0 ? 0 : 255;
  const a = Math.abs(amount);
  return `rgb(${c.map((v) => Math.round(v + (to - v) * a)).join(',')})`;
}

/** Light marks that hint at each stitch's texture in the whole-piece picture. */
function drawMarks(ctx: CanvasRenderingContext2D, row: PlannedRow, x0: number, y: number, w: number, h: number, sw: number) {
  const step = (k: number) => sw * k;
  ctx.beginPath();
  const id = row.stitch;
  if (id === 'moss') {
    const off = row.n % 2 ? 0 : sw;
    for (let x = x0 + off; x < x0 + w; x += step(2)) {
      ctx.moveTo(x + sw * 0.2, y + h * 0.5);
      ctx.lineTo(x + sw * 0.8, y + h * 0.5);
    }
  } else if (id === 'shell') {
    const off = row.cycleIndex === 0 ? sw * 3 : 0;
    for (let x = x0 + off; x < x0 + w; x += step(6)) {
      ctx.moveTo(x + sw, y + h * 0.85);
      ctx.quadraticCurveTo(x + sw * 3.5, y - h * 0.1, x + sw * 6, y + h * 0.85);
    }
  } else if (id === 'v-stitch') {
    for (let x = x0 + sw; x < x0 + w - sw; x += step(3)) {
      ctx.moveTo(x, y + h * 0.15);
      ctx.lineTo(x + sw * 1.5, y + h * 0.85);
      ctx.lineTo(x + sw * 3, y + h * 0.15);
    }
  } else if ((id === 'puff' && (row.cycleIndex === 0 || row.cycleIndex === 2)) || (id === 'bobble' && row.cycleIndex === 0)) {
    const every = id === 'puff' ? 2 : 4;
    const start = id === 'puff' ? (row.cycleIndex === 0 ? 1 : 2) : 3;
    const r = Math.max(1, Math.min(h * 0.4, sw * 0.6));
    for (let i = start; i < w / sw; i += every) {
      const cx = x0 + (i + 0.5) * sw;
      ctx.moveTo(cx + r, y + h / 2);
      ctx.arc(cx, y + h / 2, r, 0, Math.PI * 2);
    }
  } else if (designPattern(id)?.plain) {
    for (let x = x0; x < x0 + w; x += sw) {
      ctx.moveTo(x + sw * 0.15, y + h * 0.3);
      ctx.lineTo(x + sw * 0.5, y + h * 0.7);
      ctx.lineTo(x + sw * 0.85, y + h * 0.3);
    }
  }
  ctx.stroke();
}

/**
 * The whole piece to scale, row 1 at the bottom: stripes in their colors, with light marks for
 * the texture when there's room. Fast enough for a big blanket.
 */
export function PiecePreview({
  design,
  plan,
  size,
  maxWidth,
  maxHeight,
  highlight,
  label,
}: {
  design: DesignContent;
  plan: Plan;
  size: Size;
  maxWidth?: number;
  maxHeight: number;
  highlight?: number;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [boxW, setBoxW] = useState(maxWidth ?? 300);

  useEffect(() => {
    if (maxWidth) return;
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [maxWidth]);

  useLayoutEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || !plan.rows.length || size.heightCm <= 0) return;
    const scale = Math.min(boxW / size.widthCm, maxHeight / size.heightCm);
    const W = Math.max(4, size.widthCm * scale);
    const H = Math.max(4, size.heightCm * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sw = W / design.width;
    let y = H;
    plan.rows.forEach((row, i) => {
      const h = size.rowCm[i]! * scale;
      y -= h;
      const hex = design.colors[row.color]?.hex ?? '#888888';
      ctx.fillStyle = hex;
      ctx.fillRect(0, y, W, h + 0.5);
      if (h >= 3 && sw >= 2.5) {
        ctx.strokeStyle = shade(hex, -0.35);
        ctx.lineWidth = Math.max(0.6, Math.min(1.5, h * 0.12));
        ctx.globalAlpha = 0.55;
        drawMarks(ctx, row, 0, y, W, h, sw);
        ctx.globalAlpha = 1;
      }
      if (highlight === row.n) {
        ctx.strokeStyle = '#1b8fd6';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(1.25, y + 1.25, W - 2.5, Math.max(2, h - 2.5));
      }
    });
  }, [design, plan, size, boxW, maxHeight, highlight]);

  return (
    <div ref={box} className="piece-box" style={maxWidth ? { width: maxWidth } : undefined}>
      {plan.rows.length > 0 ? <canvas ref={canvas} role="img" aria-label={label} /> : <p className="muted">No rows yet.</p>}
    </div>
  );
}

/** The library swatch row for one row of the design. */
function closeUpRow(row: PlannedRow): SwatchRow {
  const sw = getStitch(row.stitch)?.swatch;
  if (!sw || sw.layout !== 'rows') return { items: [{ k: 'sc' }], fill: true };
  const pattern = designPattern(row.stitch)!;
  let base: SwatchRow;
  if (row.kind !== 'cycle') base = sw.setup?.[0] ?? sw.cycle[0]!;
  else if (sw.cycle.length === pattern.cycle.length) base = sw.cycle[row.cycleIndex % sw.cycle.length]!;
  else base = sw.cycle[(row.n - 1) % sw.cycle.length]!;
  return { ...base, ridge: row.loop !== 'both' || base.ridge };
}

/** A few rows drawn stitch by stitch, in their colors, from row `from` upwards. */
export function CloseUp({ design, plan, from, count = 8, label }: { design: DesignContent; plan: Plan; from: number; count?: number; label: string }) {
  const rows = plan.rows.slice(Math.max(0, from - 1), Math.max(0, from - 1) + count);
  const swatch = useMemo(
    () => drawRowList(rows.map((r) => ({ row: closeUpRow(r), color: design.colors[r.color]?.hex ?? '#888888' })), 14),
    // rows is derived from plan and from; recompute when they change
    [plan, from, count, design.colors],
  );
  if (!rows.length) return null;
  return <SwatchSvg swatch={swatch} label={label} className="closeup" />;
}
