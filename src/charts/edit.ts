import { MAX_COLORS, MAX_SIZE, SUGGESTED_COLORS, clampSize, type ChartContent } from './model';

/**
 * Changes to a chart's squares and colors. Every function returns a new chart and leaves the
 * one it was given unchanged (so undo can keep the old one).
 */

export function setCell(cells: readonly string[], row: number, col: number, value: number): string[] {
  const out = cells.slice();
  const r = out[row];
  if (r === undefined || col < 0 || col >= r.length) return out;
  out[row] = r.slice(0, col) + String(value) + r.slice(col + 1);
  return out;
}

export function colorCounts(c: ChartContent): number[] {
  const counts = new Array<number>(c.pal.length).fill(0);
  for (const row of c.cells) for (const ch of row) counts[Number(ch)] = (counts[Number(ch)] ?? 0) + 1;
  return counts;
}

/** Changes the size, keeping what's drawn from the top-left corner. New squares are color A. */
export function resize(c: ChartContent, w: number, h: number): ChartContent {
  const nw = clampSize(w);
  const nh = clampSize(h);
  const cells: string[] = [];
  for (let r = 0; r < nh; r++) {
    const old = c.cells[r] ?? '';
    cells.push((old.slice(0, nw) + '0'.repeat(nw)).slice(0, nw));
  }
  return {
    ...c,
    w: nw,
    h: nh,
    cells,
    done: c.done.filter((n) => n <= nh),
    cur: Math.min(c.cur, nh),
  };
}

export function canAddBorder(c: ChartContent): boolean {
  return c.w + 6 <= MAX_SIZE && c.h + 6 <= MAX_SIZE;
}

/** Adds 3 stitches of color A on every side. Progress starts over, since every row moves. */
export function addBorder(c: ChartContent): ChartContent {
  if (!canAddBorder(c)) return c;
  const w = c.w + 6;
  const blank = '0'.repeat(w);
  const cells = [blank, blank, blank, ...c.cells.map((r) => '000' + r + '000'), blank, blank, blank];
  return { ...c, w, h: c.h + 6, cells, done: [], cur: Math.min(c.cur, c.h + 6) };
}

/** Mirrors left and right. Progress is kept: the rows stay where they are. */
export function mirror(c: ChartContent): ChartContent {
  return { ...c, cells: c.cells.map((r) => [...r].reverse().join('')) };
}

/** Flips top and bottom. Progress moves with the rows. */
export function flip(c: ChartContent): ChartContent {
  return {
    ...c,
    cells: c.cells.slice().reverse(),
    done: c.done.map((n) => c.h + 1 - n).sort((a, b) => a - b),
    cur: c.h + 1 - c.cur,
  };
}

export function canAddColor(c: ChartContent): boolean {
  return c.pal.length < MAX_COLORS && c.tech !== 'mosaic';
}

/** Adds the first suggested color that isn't in the palette yet. */
export function addColor(c: ChartContent): ChartContent {
  if (!canAddColor(c)) return c;
  const used = new Set(c.pal.map((p) => p.hex.toLowerCase()));
  const next = SUGGESTED_COLORS.find((s) => !used.has(s.hex)) ?? { name: '', hex: '#888888' };
  return { ...c, pal: [...c.pal, { ...next }] };
}

/** Removes a color. Its squares become color A, and later colors move up one letter. */
export function removeColor(c: ChartContent, index: number): ChartContent {
  if (c.pal.length <= 2 || index < 0 || index >= c.pal.length) return c;
  const cells = c.cells.map((row) =>
    [...row]
      .map((ch) => {
        const v = Number(ch);
        return v === index ? '0' : String(v > index ? v - 1 : v);
      })
      .join(''),
  );
  return { ...c, cells, pal: c.pal.filter((_, i) => i !== index) };
}

export function setColor(c: ChartContent, index: number, changes: { name?: string; hex?: string }): ChartContent {
  return { ...c, pal: c.pal.map((p, i) => (i === index ? { ...p, ...changes } : p)) };
}

// ---------- Crochet progress ----------

export function markDoneAndNext(c: ChartContent): ChartContent {
  const done = c.done.includes(c.cur) ? c.done : [...c.done, c.cur].sort((a, b) => a - b);
  return { ...c, done, cur: Math.min(c.cur + 1, c.h) };
}

export function previousRow(c: ChartContent): ChartContent {
  return { ...c, cur: Math.max(1, c.cur - 1) };
}

export function goToRow(c: ChartContent, n: number): ChartContent {
  return { ...c, cur: Math.min(Math.max(1, n), c.h) };
}

export function setRowDone(c: ChartContent, n: number, isDone: boolean): ChartContent {
  const done = isDone ? [...new Set([...c.done, n])].sort((a, b) => a - b) : c.done.filter((v) => v !== n);
  return { ...c, done };
}

export function clearProgress(c: ChartContent): ChartContent {
  return { ...c, done: [], cur: 1 };
}
