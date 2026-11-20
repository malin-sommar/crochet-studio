import { MAX_COLORS, MAX_SIZE, MIN_SIZE, type ChartContent, type PaletteColor } from './model';

/**
 * Turning a picture into a chart: find the grid, sample the middle of every square, then group
 * the colors. Ported from the Tapestry Chart Tracker. Works on plain pixel arrays, so it can be
 * tested without a browser.
 */

/** A picture as lightness (L, 0-255) and color (RGB, 3 bytes per pixel), on a white background. */
export interface Pixels {
  W: number;
  H: number;
  L: Float32Array;
  RGB: Uint8ClampedArray;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pictures are scaled down to at most this many pixels on their longer side. */
export const MAX_IMAGE_SIDE = 3200;

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Reads RGBA pixels (as from a canvas), putting transparent parts on white. */
export function pixelsFromRGBA(data: Uint8ClampedArray, W: number, H: number): Pixels {
  const L = new Float32Array(W * H);
  const RGB = new Uint8ClampedArray(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const a = data[i * 4 + 3]! / 255;
    const r = data[i * 4]! * a + 255 * (1 - a);
    const g = data[i * 4 + 1]! * a + 255 * (1 - a);
    const b = data[i * 4 + 2]! * a + 255 * (1 - a);
    RGB[i * 3] = r;
    RGB[i * 3 + 1] = g;
    RGB[i * 3 + 2] = b;
    L[i] = lum(r, g, b);
  }
  return { W, H, L, RGB };
}

/** Finds the chart inside a plain margin. Returns the whole picture if there's no margin. */
export function trimMargins(px: Pixels): Box {
  const { W, H, L } = px;
  const m = L[0]!;
  const tol = 22;
  const rowFlat = (y: number) => {
    let bad = 0;
    for (let x = 0; x < W; x++) if (Math.abs(L[y * W + x]! - m) > tol) bad++;
    return bad <= W * 0.03;
  };
  const colFlat = (x: number, y0: number, y1: number) => {
    let bad = 0;
    for (let y = y0; y <= y1; y++) if (Math.abs(L[y * W + x]! - m) > tol) bad++;
    return bad <= (y1 - y0 + 1) * 0.03;
  };
  let t = 0;
  let b = H - 1;
  while (t < b && rowFlat(t)) t++;
  while (b > t && rowFlat(b)) b--;
  let l = 0;
  let r = W - 1;
  while (l < r && colFlat(l, t, b)) l++;
  while (r > l && colFlat(r, t, b)) r--;
  const box = { x: l, y: t, w: r - l + 1, h: b - t + 1 };
  const whole = { x: 0, y: 0, w: W, h: H };
  if (box.w < 4 || box.h < 4) return whole;
  // If the most common shade inside is the margin's shade, it's a background color, not a margin.
  const hist = new Array<number>(33).fill(0);
  for (let y = box.y; y < box.y + box.h; y += 2) {
    for (let x = box.x; x < box.x + box.w; x += 2) hist[Math.round(L[y * W + x]! / 8)]!++;
  }
  const mode = hist.indexOf(Math.max(...hist)) * 8;
  if (Math.abs(mode - m) < 14) return whole;
  return box;
}

/** How much a profile looks like itself shifted by each lag (index = lag, from 2 to half its length). */
function autocorrelation(prof: readonly number[]): number[] | null {
  const n = prof.length;
  let mean = 0;
  for (const v of prof) mean += v;
  mean /= n;
  const p = prof.map((v) => v - mean);
  let z = 0;
  for (const v of p) z += v * v;
  if (z < 1e-6) return null;
  const ac: number[] = [];
  for (let lag = 2; lag <= Math.floor(n / 2); lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += p[i]! * p[i + lag]!;
    ac[lag] = s / z;
  }
  return ac;
}

/** The repeat length of a profile (by autocorrelation), refined to below a pixel. */
export function profilePeriod(prof: readonly number[]): { period: number; strength: number } | null {
  const n = prof.length;
  if (n < 8) return null;
  const ac = autocorrelation(prof);
  if (!ac) return null;
  let best = 0;
  const half = Math.floor(n / 2);
  for (let lag = 2; lag <= half; lag++) if (ac[lag]! > best) best = ac[lag]!;
  if (best < 0.15) return null;
  const isPeak = (lag: number) =>
    ac[lag] !== undefined && ac[lag]! >= (ac[lag - 1] ?? -1) && ac[lag]! >= (ac[lag + 1] ?? -1);
  for (let found = 2; found <= half; found++) {
    const a = ac[found]!;
    if (a >= 0.8 * best && isPeak(found)) {
      // In pixel art without grid lines the edges can line up better every 2 or 3 squares than
      // every square. A true spacing also peaks clearly at its half or third; a real grid doesn't
      // (half-way between grid lines is the middle of a square). Prefer the smaller one.
      let lag = found;
      for (const d of [3, 2]) {
        for (const sub of [Math.round(found / d) - 1, Math.round(found / d), Math.round(found / d) + 1]) {
          if (sub >= 2 && Math.abs(sub * d - found) <= 1 && isPeak(sub) && ac[sub]! >= 0.5 * a) {
            lag = sub;
            break;
          }
        }
        if (lag !== found) break;
      }
      // Use the strongest multiple near k * lag to get a period below one pixel.
      const k = Math.max(1, Math.floor(n / 2 / lag));
      let bl = lag * k;
      let bv = -1;
      for (let q = lag * k - 2; q <= lag * k + 2; q++) {
        if (ac[q] !== undefined && ac[q]! > bv) {
          bv = ac[q]!;
          bl = q;
        }
      }
      return { period: bl / k, strength: ac[lag]! };
    }
  }
  return null;
}

/** For pixel art: the most common run length of the same shade, if the edges are sharp. */
export function runScale(px: Pixels, c: Box): number | null {
  const { W, L } = px;
  const hist: Record<number, number> = {};
  let N = 0;
  let hard = 0;
  let trans = 0;
  const step = Math.max(1, Math.floor(c.h / 300));
  for (let y = c.y; y < c.y + c.h; y += step) {
    let run = 1;
    let first = true;
    for (let x = c.x + 1; x < c.x + c.w; x++) {
      const d = Math.abs(L[y * W + x]! - L[y * W + x - 1]!);
      if (d <= 10) run++;
      else {
        trans++;
        if (d > 60) hard++;
        if (!first) {
          hist[run] = (hist[run] ?? 0) + 1;
          N++;
        }
        first = false;
        run = 1;
      }
    }
  }
  if (N < 20 || hard < trans * 0.6) return null;
  const need = Math.max(3, N * 0.03);
  for (let k = 1; k <= 64; k++) if ((hist[k] ?? 0) >= need) return k;
  return null;
}

/** For charts with grid lines: the spacing of the lines across and down. */
export function gridSpacing(px: Pixels, c: Box): { period: number; periodY: number } | null {
  const { W, L } = px;
  const ex = new Array<number>(c.w).fill(0);
  const ey = new Array<number>(c.h).fill(0);
  const vx = new Array<number>(c.w).fill(0);
  const vy = new Array<number>(c.h).fill(0);
  const at = (x: number, y: number) => L[y * W + x]!;
  for (let y = c.y + 1; y < c.y + c.h - 1; y++) {
    for (let x = c.x + 1; x < c.x + c.w - 1; x++) {
      const v = at(x, y);
      ex[x - c.x]! += Math.abs(v - at(x - 1, y));
      ey[y - c.y]! += Math.abs(v - at(x, y - 1));
      // Thin grid lines: a pixel darker than both neighbours across (or down)
      if (at(x - 1, y) - v > 4 && at(x + 1, y) - v > 4) vx[x - c.x]!++;
      if (at(x, y - 1) - v > 4 && at(x, y + 1) - v > 4) vy[y - c.y]!++;
    }
  }
  const pick = (lines: number[], edges: number[]) => {
    // Grid lines closer than 4 pixels apart aren't a chart: that's JPEG noise, which has a
    // 2-pixel pattern of slightly darker pixels.
    const found = profilePeriod(lines);
    const pl = found && found.period >= 4 ? found : null;
    const pe = profilePeriod(edges);
    if (pl && pl.strength >= 0.3) {
      // Real grid lines make edges at the same spacing. If the edges clearly repeat at another
      // spacing, the "lines" are JPEG ringing at some color boundaries: trust the edges.
      if (pe && pe.strength >= 0.5 && Math.abs(pl.period - pe.period) > 0.08 * pe.period) return pe;
      return pl;
    }
    return pe ?? pl;
  };
  const a = pick(vx, ex);
  const b = pick(vy, ey);
  if (a && b) return { period: a.period, periodY: b.period };
  if (a) return { period: a.period, periodY: a.period };
  if (b) return { period: b.period, periodY: b.period };
  return null;
}

const clampCount = (v: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(v)));

/** How many squares across and down the chart in this box has. */
export function detectGrid(px: Pixels, c: Box): { cols: number; rows: number } {
  if (c.w <= 200 && c.h <= 200) {
    const rs = runScale(px, c);
    if (rs) return { cols: clampCount(c.w / rs), rows: clampCount(c.h / rs) };
  }
  const g = gridSpacing(px, c);
  if (g) return { cols: clampCount(c.w / g.period), rows: clampCount(c.h / g.periodY) };
  const rs = runScale(px, c);
  if (rs) return { cols: clampCount(c.w / rs), rows: clampCount(c.h / rs) };
  return { cols: clampCount(c.w / 10), rows: clampCount(c.h / 10) };
}

/** The average color of the middle of every square (3 numbers per square, row by row). */
export function sampleCells(px: Pixels, c: Box, cols: number, rows: number): Float32Array {
  const { W, H, RGB } = px;
  const cw = c.w / cols;
  const ch = c.h / rows;
  const vals = new Float32Array(cols * rows * 3);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const x0 = Math.floor(c.x + (q + 0.3) * cw);
      const x1 = Math.max(x0, Math.ceil(c.x + (q + 0.7) * cw) - 1);
      const y0 = Math.floor(c.y + (r + 0.3) * ch);
      const y1 = Math.max(y0, Math.ceil(c.y + (r + 0.7) * ch) - 1);
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let y = y0; y <= y1 && y < H; y++) {
        for (let x = x0; x <= x1 && x < W; x++) {
          const i = (y * W + x) * 3;
          sr += RGB[i]!;
          sg += RGB[i + 1]!;
          sb += RGB[i + 2]!;
          n++;
        }
      }
      const o = (r * cols + q) * 3;
      vals[o] = n ? sr / n : 255;
      vals[o + 1] = n ? sg / n : 255;
      vals[o + 2] = n ? sb / n : 255;
    }
  }
  return vals;
}

export interface Quantized {
  /** Group colors, lightest first. */
  centers: number[][];
  /** For every square, its group. */
  assign: number[];
  /** How far the squares are from their group colors in total (lower is a better fit). */
  sse: number;
}

/** Groups colors into k groups (k-means, with a fixed start so it always gives the same result). */
export function kmeans(vals: Float32Array, k: number): Quantized {
  const N = vals.length / 3;
  const d2 = (i: number, c: number[]) => {
    const a = vals[i * 3]! - c[0]!;
    const b = vals[i * 3 + 1]! - c[1]!;
    const e = vals[i * 3 + 2]! - c[2]!;
    return a * a + b * b + e * e;
  };
  // Start from the lightest square, then repeatedly the square farthest from all chosen ones.
  let li = 0;
  let lb = -1;
  for (let i = 0; i < N; i++) {
    const l = lum(vals[i * 3]!, vals[i * 3 + 1]!, vals[i * 3 + 2]!);
    if (l > lb) {
      lb = l;
      li = i;
    }
  }
  const C: number[][] = [[vals[li * 3]!, vals[li * 3 + 1]!, vals[li * 3 + 2]!]];
  const md = new Float64Array(N).fill(Infinity);
  while (C.length < k) {
    let bi = -1;
    let bd = -1;
    for (let i = 0; i < N; i++) {
      md[i] = Math.min(md[i]!, d2(i, C[C.length - 1]!));
      if (md[i]! > bd) {
        bd = md[i]!;
        bi = i;
      }
    }
    if (bd <= 0) break;
    C.push([vals[bi * 3]!, vals[bi * 3 + 1]!, vals[bi * 3 + 2]!]);
  }
  const A = new Uint8Array(N);
  for (let it = 0; it < 25; it++) {
    let moved = false;
    for (let i = 0; i < N; i++) {
      let bj = 0;
      let bd = Infinity;
      for (let j = 0; j < C.length; j++) {
        const dd = d2(i, C[j]!);
        if (dd < bd) {
          bd = dd;
          bj = j;
        }
      }
      if (A[i] !== bj) {
        A[i] = bj;
        moved = true;
      }
    }
    const sums = C.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < N; i++) {
      const s = sums[A[i]!]!;
      s[0]! += vals[i * 3]!;
      s[1]! += vals[i * 3 + 1]!;
      s[2]! += vals[i * 3 + 2]!;
      s[3]!++;
    }
    sums.forEach((s, j) => {
      if (s[3]) C[j] = [s[0]! / s[3], s[1]! / s[3], s[2]! / s[3]];
    });
    if (!moved && it > 0) break;
  }
  let sse = 0;
  for (let i = 0; i < N; i++) sse += d2(i, C[A[i]!]!);
  // Keep only groups in use, lightest first
  const order = [...new Set(A)].sort((a, b) => lum(...(C[b] as [number, number, number])) - lum(...(C[a] as [number, number, number])));
  const remap = new Map(order.map((j, ix) => [j, ix]));
  return { centers: order.map((j) => C[j]!), assign: Array.from(A, (a) => remap.get(a)!), sse };
}

/** Guesses how many yarn colors the picture has (2 to 8). */
export function autoColorCount(vals: Float32Array): number {
  const N = vals.length / 3;
  const uniq: number[][] = [];
  for (let i = 0; i < N && uniq.length <= MAX_COLORS; i++) {
    const near = uniq.some(
      (u) => Math.abs(u[0]! - vals[i * 3]!) + Math.abs(u[1]! - vals[i * 3 + 1]!) + Math.abs(u[2]! - vals[i * 3 + 2]!) < 36,
    );
    if (!near) uniq.push([vals[i * 3]!, vals[i * 3 + 1]!, vals[i * 3 + 2]!]);
  }
  if (uniq.length <= MAX_COLORS) return Math.max(2, uniq.length);
  let prev = kmeans(vals, 2).sse;
  for (let k = 3; k <= 6; k++) {
    const s = kmeans(vals, k).sse;
    if (s > prev * 0.6) return k - 1;
    prev = s;
  }
  return 6;
}

export function quantize(vals: Float32Array, colors: number | 'auto'): Quantized {
  return kmeans(vals, colors === 'auto' ? autoColorCount(vals) : colors);
}

export function toHex(c: readonly number[]): string {
  return '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
}

/** The chart made from an import. */
export function chartFromImport(name: string, cols: number, rows: number, q: Quantized): ChartContent {
  const names = q.centers.length === 2 ? ['Light', 'Dark'] : [];
  const pal: PaletteColor[] = q.centers.map((c, i) => ({ hex: toHex(c), name: names[i] ?? '' }));
  if (pal.length < 2) pal.push({ hex: '#2b2d3d', name: 'Dark' });
  const cells: string[] = [];
  for (let r = 0; r < rows; r++) {
    let row = '';
    for (let q2 = 0; q2 < cols; q2++) row += String(q.assign[r * cols + q2]);
    cells.push(row);
  }
  return {
    name: name.trim().slice(0, 60) || 'Imported chart',
    w: cols,
    h: rows,
    cells,
    pal,
    tech: 'tapestry',
    rev: false,
    mfirst: 0,
    cur: 1,
    done: [],
  };
}

/** A chart name from a file name: no extension, underscores and dashes as spaces. */
export function nameFromFile(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 60);
}
