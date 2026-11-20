/**
 * Reading a chart's size and position from the row and column numbers printed around it in a PDF
 * pattern (for example from Stitch Fiddle). Ported from the Tapestry Chart Tracker.
 */

/** A number printed on the page, at its centre (page pixels). */
export interface PageNumber {
  n: number;
  x: number;
  y: number;
}

export interface AxisFit {
  /** How many rows (or columns) the numbers cover. */
  count: number;
  /** Where the first square starts, and how long all squares together are (page pixels). */
  start: number;
  len: number;
}

function fitLine(pts: readonly [number, number][]): { a: number; b: number } | null {
  const n = pts.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const d = n * sxx - sx * sx;
  if (!d) return null;
  const b = (n * sxy - sx * sy) / d;
  return { a: (sy - b * sx) / n, b };
}

/**
 * Finds a numbered sequence of labels that share a line. `key` is the direction the labels share
 * (y for column numbers along the top or bottom), `other` the direction they count along.
 */
export function labelAxis(nums: readonly PageNumber[], key: 'x' | 'y', other: 'x' | 'y'): AxisFit | null {
  const sorted = nums.slice().sort((p, q) => p[key] - q[key]);
  const groups: PageNumber[][] = [];
  let g: PageNumber[] = [];
  for (const p of sorted) {
    if (g.length && Math.abs(p[key] - g[g.length - 1]![key]) > 3) {
      groups.push(g);
      g = [];
    }
    g.push(p);
  }
  if (g.length) groups.push(g);

  const fits: { lo: number; hi: number; f: { a: number; b: number } }[] = [];
  for (const grp of groups) {
    const ns = [...new Set(grp.map((p) => p.n))];
    if (ns.length < 5) continue;
    const f = fitLine(grp.map((p) => [p.n, p[other]]));
    if (!f || Math.abs(f.b) < 3) continue;
    const err = grp.reduce((s, p) => s + Math.abs(f.a + f.b * p.n - p[other]), 0) / grp.length;
    if (err > Math.abs(f.b) * 0.25) continue;
    fits.push({ lo: Math.min(...ns), hi: Math.max(...ns), f });
  }
  if (!fits.length) return null;
  fits.sort((p, q) => q.hi - q.lo - (p.hi - p.lo));
  const best = { ...fits[0]! };
  // Labels are often split between both sides (odd rows on one side, even on the other):
  // merge lines that agree.
  for (const o of fits.slice(1)) {
    const cell = Math.abs(best.f.b);
    if (Math.abs(o.f.b - best.f.b) < cell * 0.05 && Math.abs(o.f.a - best.f.a) < cell * 0.4) {
      best.lo = Math.min(best.lo, o.lo);
      best.hi = Math.max(best.hi, o.hi);
    }
  }
  const cell = Math.abs(best.f.b);
  const e1 = best.f.a + best.f.b * best.lo;
  const e2 = best.f.a + best.f.b * best.hi;
  return { count: best.hi - best.lo + 1, start: Math.min(e1, e2) - cell / 2, len: Math.abs(e2 - e1) + cell };
}

/** The chart's box and size from the numbers on a page, or null if they can't be read. */
export function gridFromLabels(
  nums: readonly PageNumber[],
): { crop: { x: number; y: number; w: number; h: number }; cols: number; rows: number } | null {
  const cx = labelAxis(nums, 'y', 'x');
  const ry = labelAxis(nums, 'x', 'y');
  if (!cx || !ry) return null;
  return { crop: { x: cx.start, y: ry.start, w: cx.len, h: ry.len }, cols: cx.count, rows: ry.count };
}

/** Whether a piece of page text is a row or column number. */
export function isLabelText(s: string): boolean {
  return /^\s*\d{1,3}\s*$/.test(s);
}

/**
 * The numbers in a piece of page text, with the x of each one's centre. The PDF reader joins
 * numbers that sit close together on a line into one piece ("9 10 11 12"); labels are evenly
 * spaced, so the ones in between are placed evenly from the first to the last.
 * Returns null if the text isn't only numbers.
 */
export function splitLabels(s: string, left: number, width: number): { n: number; x: number }[] | null {
  const t = s.trim();
  if (!/^\d{1,3}(\s+\d{1,3})*$/.test(t)) return null;
  const parts = t.split(/\s+/);
  if (parts.length === 1) return [{ n: Number(parts[0]), x: left + width / 2 }];
  // Width units: digits 1, spaces about half a digit (as in most fonts).
  const lead = s.length - s.trimStart().length;
  const trail = s.length - s.trimEnd().length;
  const units = lead * 0.5 + trail * 0.5 + parts.reduce((u, p) => u + p.length, 0) + (parts.length - 1) * 0.5;
  const unit = width / units;
  const first = left + (lead * 0.5 + parts[0]!.length / 2) * unit;
  const last = left + width - (trail * 0.5 + parts[parts.length - 1]!.length / 2) * unit;
  return parts.map((p, i) => ({ n: Number(p), x: first + ((last - first) * i) / (parts.length - 1) }));
}
