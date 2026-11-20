/**
 * Test pictures made from scratch: random charts, drawn as 1:1 pixel art, scaled pixel art, or
 * chart screenshots with grid lines and a margin. Used by the Node tests (as pixel arrays) and the
 * browser tests (encoded as real PNG and JPEG files).
 */

/**
 * Yarn-like colors that can be told apart in a JPEG. (Two very similar dark colors, like navy and
 * dark green, can merge when the app picks the number of colors itself; choosing the number of
 * colors fixes that.)
 */
export const TEST_COLORS = ['#f3ead8', '#8c1d3c', '#d4a017', '#2b2d3d', '#7fa37a'];

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A chart with a background (0) and rectangles in the other colors, like simple pixel art. */
export function randomChart(seed: number, w: number, h: number, colors: number): string[] {
  const random = rng(seed);
  const g = Array.from({ length: h }, () => new Array<number>(w).fill(0));
  for (let i = 0; i < Math.round((w * h) / 18); i++) {
    const c = 1 + Math.floor(random() * (colors - 1));
    const rw = 1 + Math.floor(random() * 4);
    const rh = 1 + Math.floor(random() * 4);
    const x0 = Math.floor(random() * w);
    const y0 = Math.floor(random() * h);
    for (let y = y0; y < Math.min(h, y0 + rh); y++) for (let x = x0; x < Math.min(w, x0 + rw); x++) g[y]![x] = c;
  }
  // Make sure every color appears
  for (let c = 1; c < colors; c++) g[c % h]![(c * 3) % w] = c;
  return g.map((r) => r.join(''));
}

export interface DrawStyle {
  /** Pixels per square. */
  cell: number;
  /** Width of the grid lines in pixels (0 for pixel art). */
  line?: number;
  lineColor?: string;
  /** Plain margin around the chart, in pixels. */
  margin?: number;
  marginColor?: string;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** Draws a chart as RGBA pixels. */
export function drawPicture(cells: string[], colors: string[], s: DrawStyle): { data: Uint8ClampedArray; W: number; H: number } {
  const line = s.line ?? 0;
  const margin = s.margin ?? 0;
  const w = cells[0]!.length;
  const h = cells.length;
  const W = margin * 2 + w * s.cell + (line ? line : 0);
  const H = margin * 2 + h * s.cell + (line ? line : 0);
  const data = new Uint8ClampedArray(W * H * 4);
  const mc = rgb(s.marginColor ?? '#ffffff');
  const lc = rgb(s.lineColor ?? '#8a8a8a');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = mc;
      const gx = x - margin;
      const gy = y - margin;
      if (gx >= 0 && gy >= 0 && gx < w * s.cell + line && gy < h * s.cell + line) {
        const onLine = line > 0 && (gx % s.cell < line || gy % s.cell < line);
        if (onLine) c = lc;
        else {
          const col = Math.min(w - 1, Math.floor(gx / s.cell));
          const row = Math.min(h - 1, Math.floor(gy / s.cell));
          c = rgb(colors[Number(cells[row]![col])]!);
        }
      }
      const o = (y * W + x) * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return { data, W, H };
}

/** Whether two charts have the same squares, allowing the color numbers to differ consistently. */
export function sameChart(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length || a[0]?.length !== b[0]?.length) return false;
  const ab = new Map<string, string>();
  const ba = new Map<string, string>();
  for (let r = 0; r < a.length; r++) {
    for (let x = 0; x < a[r]!.length; x++) {
      const p = a[r]![x]!;
      const q = b[r]![x]!;
      if ((ab.has(p) && ab.get(p) !== q) || (ba.has(q) && ba.get(q) !== p)) return false;
      ab.set(p, q);
      ba.set(q, p);
    }
  }
  return true;
}
