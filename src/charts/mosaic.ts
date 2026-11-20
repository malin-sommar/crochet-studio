import type { ChartContent } from './model';

/**
 * Overlay mosaic crochet.
 *
 * Each crochet row n (1 = bottom) is worked in one color, alternating A and B: rowColor(n).
 * A square that shows the other color is covered by an X (dc in the front loop two rows below)
 * from the row above. So the stitches follow from the picture. In reversible mode, a stitch right
 * above an X is an anchored dc (A).
 */

export type MosaicStitch = 'sc' | 'X' | 'A';
export type StitchRun = [stitch: MosaicStitch, count: number];

export function rowColor(c: ChartContent, n: number): 0 | 1 {
  return n % 2 === 1 ? c.mfirst : ((1 - c.mfirst) as 0 | 1);
}

/** The palette index shown at row n (1 = bottom), column col (0 = left). */
export function shownColor(c: ChartContent, n: number, col: number): number {
  return Number(c.cells[c.h - n]?.[col]);
}

/** Whether the square shows something other than its own row's color. */
export function isOff(c: ChartContent, n: number, col: number): boolean {
  return n >= 1 && n <= c.h && shownColor(c, n, col) !== rowColor(c, n);
}

export function stitchAt(c: ChartContent, n: number, col: number): MosaicStitch {
  if (n <= 2) return 'sc';
  if (isOff(c, n - 1, col)) return 'X';
  if (c.rev && n >= 4 && isOff(c, n - 2, col)) return 'A';
  return 'sc';
}

/** The stitches of row n in working order: always from the front, right to left. */
export function mosaicRuns(c: ChartContent, n: number): StitchRun[] {
  const out: StitchRun[] = [];
  let prev: MosaicStitch | null = null;
  let k = 0;
  for (let col = c.w - 1; col >= 0; col--) {
    const t = stitchAt(c, n, col);
    if (t === prev) k++;
    else {
      if (prev) out.push([prev, k]);
      prev = t;
      k = 1;
    }
  }
  if (prev) out.push([prev, k]);
  return out;
}

export function mosaicRowText(c: ChartContent, n: number): string {
  return mosaicRuns(c, n)
    .map(([t, k]) => `${k} ${t}`)
    .join(', ');
}

export interface MosaicCheck {
  /** Squares that can't be made, as "row index from the top,column". */
  bad: Set<string>;
  /** Up to six explanations, for the first problems found. */
  messages: string[];
}

export function checkMosaic(c: ChartContent): MosaicCheck {
  const bad = new Set<string>();
  const messages: string[] = [];
  const add = (n: number, col: number, msg: string) => {
    bad.add(`${c.h - n},${col}`);
    if (msg && messages.length < 6) messages.push(msg);
  };
  for (let n = 1; n <= c.h; n++) {
    for (let col = 0; col < c.w; col++) {
      const v = shownColor(c, n, col);
      const where = `Row ${n}, stitch ${c.w - col}`;
      if (v > 1) {
        add(n, col, `${where}: mosaic uses only colors A and B.`);
        continue;
      }
      if (!isOff(c, n, col)) continue;
      if (n === 1) add(n, col, `${where}: row 1 can only be its own color (nothing can cover it yet).`);
      else if (n === c.h)
        add(
          n,
          col,
          `${where}: the top row can only be its own color (no row above to cover it). Add a row on top or change the square.`,
        );
      else if (isOff(c, n + 1, col)) {
        add(
          n,
          col,
          `${where}: this square and the one above it both use the other row's color, which would need two X on top of each other.`,
        );
        add(n + 1, col, '');
      } else if (col === 0 || col === c.w - 1)
        add(
          n,
          col,
          `${where}: the edge stitches are always sc, so the outer columns can only show each row's own color.`,
        );
    }
  }
  return { bad, messages };
}

/** The back of a reversible piece: mirrored, with A and B swapped. Palette indices, top row first. */
export function backCells(c: ChartContent): number[][] {
  return c.cells.map((row) =>
    [...row].reverse().map((ch) => {
      const v = Number(ch);
      return v > 1 ? 0 : 1 - v;
    }),
  );
}
