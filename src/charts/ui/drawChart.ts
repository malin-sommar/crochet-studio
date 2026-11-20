import { lightness, type ChartContent } from '../model';
import { rowColor, stitchAt } from '../mosaic';

export interface DrawOptions {
  /** Size of one square in CSS pixels. */
  cs: number;
  mode: 'edit' | 'crochet';
  /** Page background and text colors, from the theme. */
  bg: string;
  ink: string;
  /** Mosaic squares that break the rules, as "row from top,column". */
  bad?: Set<string> | null;
}

/** Width of the margin on the right, where row numbers go. */
export function marginRight(c: ChartContent, cs: number): number {
  return Math.max(22, cs) + (c.tech === 'mosaic' ? 6 : 0);
}

export function chartPixelSize(c: ChartContent, cs: number): { width: number; height: number } {
  return { width: c.w * cs + marginRight(c, cs), height: c.h * cs };
}

/**
 * How many device pixels per CSS pixel to draw with: sharp on high-density screens, but small
 * enough that very large charts stay within what phones can draw.
 */
export function canvasScale(width: number, height: number, dpr: number): number {
  return Math.max(0.5, Math.min(dpr, Math.sqrt(16_000_000 / (width * height)), 8192 / Math.max(width, height)));
}

export function drawChart(ctx: CanvasRenderingContext2D, c: ChartContent, o: DrawOptions): void {
  const { cs } = o;
  const { width, height } = chartPixelSize(c, cs);
  const mosaic = c.tech === 'mosaic';
  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, width, height);

  // Squares, one rectangle per run of the same color
  for (let r = 0; r < c.h; r++) {
    const row = c.cells[r]!;
    let start = 0;
    for (let x = 1; x <= c.w; x++) {
      if (x === c.w || row[x] !== row[start]) {
        ctx.fillStyle = (c.pal[Number(row[start])] ?? c.pal[0]!).hex;
        ctx.fillRect(start * cs, r * cs, (x - start) * cs, cs);
        start = x;
      }
    }
  }

  // Done rows are faded in crochet mode
  if (o.mode === 'crochet' && c.done.length) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = o.bg;
    for (const n of c.done) ctx.fillRect(0, (c.h - n) * cs, c.w * cs, cs);
    ctx.restore();
  }

  // Row numbers: row 1 and every 5th
  if (cs >= 10) {
    ctx.fillStyle = o.ink;
    ctx.font = `${Math.min(11, cs * 0.6)}px ui-monospace, monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (let n = 1; n <= c.h; n++) {
      if (n === 1 || n % 5 === 0) ctx.fillText(String(n), c.w * cs + (mosaic ? 8 : 4), (c.h - n) * cs + cs / 2);
    }
  }

  // Grid: thin lines, and stronger ones every 10 squares
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,.14)';
  ctx.beginPath();
  for (let i = 0; i <= c.w; i++) {
    ctx.moveTo(i * cs + 0.5, 0);
    ctx.lineTo(i * cs + 0.5, height);
  }
  for (let i = 0; i <= c.h; i++) {
    ctx.moveTo(0, i * cs + 0.5);
    ctx.lineTo(c.w * cs, i * cs + 0.5);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.38)';
  ctx.beginPath();
  for (let i = 0; i <= c.w; i += 10) {
    ctx.moveTo(i * cs + 0.5, 0);
    ctx.lineTo(i * cs + 0.5, height);
  }
  for (let i = 0; i <= c.h; i += 10) {
    const y = (c.h - i) * cs + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(c.w * cs, y);
  }
  ctx.stroke();

  if (mosaic) {
    // Each row's color in a strip on the right, X and anchored stitches marked, problems outlined
    for (let r = 0; r < c.h; r++) {
      const n = c.h - r;
      ctx.fillStyle = c.pal[rowColor(c, n)]!.hex;
      ctx.fillRect(c.w * cs + 1, r * cs + 1, 4, cs - 2);
      if (cs < 12) continue;
      ctx.font = `bold ${Math.round(cs * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let col = 0; col < c.w; col++) {
        const t = stitchAt(c, n, col);
        if (t === 'sc') continue;
        const under = (c.pal[Number(c.cells[r]![col])] ?? c.pal[0]!).hex;
        ctx.fillStyle = lightness(under) > 150 ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.75)';
        ctx.fillText(t === 'X' ? '×' : 'a', col * cs + cs / 2, r * cs + cs / 2 + 1);
      }
      ctx.textAlign = 'left';
    }
    if (o.bad?.size) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e5322b';
      for (const key of o.bad) {
        const [r, col] = key.split(',').map(Number) as [number, number];
        ctx.strokeRect(col * cs + 1, r * cs + 1, cs - 2, cs - 2);
      }
    }
  }

  // The current row in crochet mode
  if (o.mode === 'crochet') {
    const y = (c.h - c.cur) * cs;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1b8fd6';
    ctx.strokeRect(1.5, y + 1.5, c.w * cs - 3, cs - 3);
    if (cs >= 10) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(3.5, y + 3.5, c.w * cs - 7, cs - 7);
    }
  }
}

/** Draws the chart one pixel per square, for small previews. */
export function drawThumbnail(ctx: CanvasRenderingContext2D, c: ChartContent): void {
  const img = ctx.createImageData(c.w, c.h);
  const rgb = c.pal.map((p) => [1, 3, 5].map((i) => parseInt(p.hex.slice(i, i + 2), 16)));
  for (let r = 0; r < c.h; r++) {
    for (let x = 0; x < c.w; x++) {
      const [R, G, B] = rgb[Number(c.cells[r]![x])] ?? rgb[0]!;
      const o = (r * c.w + x) * 4;
      img.data[o] = R!;
      img.data[o + 1] = G!;
      img.data[o + 2] = B!;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
